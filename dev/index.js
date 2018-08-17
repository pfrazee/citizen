/* globals DatArchive URL */

import {toUrl, toDomain, ensureFolderExists, ignoreNotFound, deepClone} from './util.js'
import {User} from './user.js'
import * as Schemas from './schemas.js'

const POST_FILE_PATH_REGEX = /^\/posts\/[^\/]+\.json$/i

// exported api
// =

export class Index extends DatArchive {
  constructor (url) {
    super(toUrl(url))

    this._state = null
    this.isEditable = false
    this.microblog = new MicroblogAPI(this)
    this.social = new SocialAPI(this)
  }

  getIndexUrl () {
    return this.url + '/index/citizen.json'
  }

  async setup () {
    var info = await this.getInfo()
    this.isEditable = info.isOwner
    await this._load()

    if (this.isEditable) {
      await ensureFolderExists(this, '/index')
      await ensureFolderExists(this, '/index/citizen')
    }

    await Promise.all([
      this.microblog.setup(),
      this.social.setup()
    ])
  }

  async _load () {
    try {
      this._state = new Schemas.CitizenIndex(await this.readFile('/index/citizen.json'), this.getIndexUrl())
    } catch (e) {
      console.warn('Failed to read the citizen index state', e)
      this._state = new Schemas.CitizenIndex({}, this.getIndexUrl())
    }
  }

  async _save () {
    return this.writeFile('/index/citizen.json', JSON.stringify(this._state))    
  }

  async crawlSite (url, opts) {
    opts = new Schemas.CrawlOpts(opts)
    var user = new User(url)
    var domain = user.getDomainName()
    var siteState = this._state.sites[domain]

    if (!siteState) {
      siteState = this._state.sites[domain] = {key: '', name: '', version: 0}
    }
    
    var key = await DatArchive.resolveName(domain)
    if (siteState.key && siteState.key !== key) { // key change
      // warn user
      // TODO

      // reset user
      await Promise.all([
        this.microblog.uncrawlSite(user),
        this.social.uncrawlSite(user)
      ])
      siteState = this._state.sites[domain] = {key, name: '', version: 0}
    }

    // index up to current version
    var previousVersion = siteState && typeof siteState.version === 'number' ? siteState.version : 0
    var {version} = await user.getInfo()
    var changes = await user.history({start: previousVersion, end: version + 1})
    await Promise.all([
      this.microblog.crawlSite(user, changes, opts),
      this.social.crawlSite(user, changes, opts)
    ])

    // fetch latest username
    var profile = await user.getProfile().catch(e => ({}))

    // update crawl state
    this._state.sites[domain] = {key, version, name: profile.name || ''}
    await this._save()
  }

  async uncrawlSite (url) {
    var user = new User(url)
    var domain = user.getDomainName()

    // remove all previously indexed data
    await Promise.all([
      this.microblog.uncrawlSite(user),
      this.social.uncrawlSite(user)
    ])

    // update crawl state
    delete this._state.sites[domain]
    await this._save()
  }

  listCrawledSites () {
    return deepClone(this._state.sites)
  }

  getCrawledSite (domain) {
    domain = toDomain(domain)
    return (domain in this._state.sites) ? deepClone(this._state.sites[domain]) : {key: '', name: '', version: 0}
  }
}

// internal methods
// =

class IndexAPI {
  constructor (archive) {
    this.archive = archive
  }

  async setup () {
    // should be overridden as needed
  }

  async crawl (url, opts) {
    // should be overridden as needed
  }
}

class MicroblogAPI extends IndexAPI {
  constructor (archive) {
    super(archive)
    this._state = null
  }

  getIndexUrl () {
    return this.archive.url + '/index/citizen/microblog.json'
  }

  async setup () {
    await this._load()
    // TODO watch for changes to the index in other tabs
  }

  async _load () {
    try {
      this._state = new Schemas.MicroblogIndex(await this.archive.readFile('/index/citizen/microblog.json'), this.getIndexUrl())
    } catch (e) {
      console.warn('Failed to read the microblog state', e)
      this._state = new Schemas.MicroblogIndex({}, this.getIndexUrl())
    }
  }

  async _save () {
    return this.archive.writeFile('/index/citizen/microblog.json', JSON.stringify(this._state))    
  }

  async crawlSite (user, changes, opts) {
    var domain = user.getDomainName()

    // get a list of files that need indexing since last crawl()
    var changesToIndex = {}
    for (let change of changes) {
      if (POST_FILE_PATH_REGEX.test(change.path)) {
        let filename = change.path.slice('/posts/'.length)
        changesToIndex[filename] = change
      }
    }

    // read and index files
    // NOTE this is pretty lazy (filter out, re/add, sort) but I'm not going to optimize this until I need to -prf
    for (var filename in changesToIndex) {
      // remove existing
      this._state.feed = this._state.feed.filter(p => !(p.author === domain && p.filename === filename))
      // TODO remove thread

      if (changesToIndex[filename].type === 'del') {
        // no new data to index, remove only
        continue
      }

      // fetch latest
      let post = await user.microblog.get(filename)

      // feed index
      if (opts.indexes.microblog.feed) {
        if (!post.threadRoot && !post.threadParent) { // root posts only
          this._state.feed.push(Schemas.MicroblogIndex.postToFeedItem(post)) // add / readd
        }
      }

      // threads index
      if (opts.indexes.microblog.replies) {
        if (post.threadRoot) {
          let arr = this._state.threads[post.threadRoot]
          if (!arr) {
            arr = this._state.threads[post.threadRoot] = []
          }
          if (!arr.includes(post.getUrl())) {
            arr.push(post.getUrl())
          }
        }
      }
    }
    this._state.feed.sort((a, b) => b.createdAt - a.createdAt) // sort by timestamp

    // write updated state
    await this._save()
  }

  async uncrawlSite (user) {
    var domain = user.getDomainName()

    // remove all previously indexed data
    let origin = `dat://${domain}/`
    this._state.feed = this._state.feed.filter(post => post.author !== domain)
    for (let threadUrl in this._state.threads) {
      this._state.threads[threadUrl] = this._state.threads[threadUrl].filter(url => {
        return !url.startsWith(origin)
      })
    }

    // write updated state
    await this._save()
  }

  async listFeed (query) {
    query = new Schemas.MicroblogIndexFeedQuery(query)
    var {after, before, includeContent, offset, limit, reverse} = query

    var results = this._state.feed.slice()

    if (before || after) {
      results = results.filter(meta => {
        if (before && meta.createdAt >= before) return false
        if (after && meta.createdAt <= after) return false
        return true
      })
    }

    if (reverse) results = results.reverse()
    if (offset && limit) results = results.slice(offset, limit)
    else if (offset) results = results.slice(offset)
    else if (limit) results = results.slice(0, limit)

    if (includeContent) {
      let users = {}
      for (let i = 0; i < results.length; i++) {
        let result = results[i]
        let user = users[result.author]
        user = users[result.author] = user || new User(result.author)
        results[i] = Object.assign({}, {
          post: await user.microblog.get(result.filename).catch(ignoreNotFound)
        }, result)
      }
    }

    return results
  }

  async getPost (url, {allowNotFound} = {}) {
    var urlp = new URL(toUrl(url))
    var user = new User(urlp.origin)
    var promise = user.microblog.get(urlp.pathname.split('/').pop())
    if (allowNotFound) {
      promise.catch(ignoreNotFound)
    }
    return promise
  }

  async getThread (url) {
    // read the given post
    url = toUrl(url)
    var post = await this.getPost(url)

    // determine the thread root
    var threadRootUrl = post.threadRoot || url

    // get the replies
    var threadUrls = (this._state.threads[threadRootUrl] || []).slice()
    if (threadUrls.indexOf(threadRootUrl) === -1) {
      // add the thread root
      threadUrls.unshift(threadRootUrl)
    }

    // read the posts
    var threadPosts = await Promise.all(threadUrls.map(url => this.getPost(url, {allowNotFound: true})))

    // create a map for fast lookup by url
    var threadPostsByUrl = {}
    for (let post of threadPosts) {
      if (post) {
        threadPostsByUrl[post.getUrl()] = post
      }
    }

    // create a tree-structure by populating parent & children pointers
    for (let post of threadPosts) {
      let parent = post.threadParent ? threadPostsByUrl[post.threadParent] : undefined
      post.parent = parent
      post.root = threadRootUrl && post.getUrl() !== threadRootUrl ? threadPostsByUrl[threadRootUrl] : undefined
      if (parent) {
        parent.replies = parent.replies || []
        parent.replies.push(post)
      }
    }

    // return the target record
    return threadPostsByUrl[url]
  }
}

class SocialAPI extends IndexAPI {
  constructor (archive) {
    super(archive)
    this._state = null
  }

  getIndexUrl () {
    return this.archive.url + '/index/citizen/social.json'
  }

  async setup () {
    await this._load()
    // TODO watch for changes to the index in other tabs
  }

  async _load () {
    try {
      this._state = new Schemas.SocialIndex(await this.archive.readFile('/index/citizen/social.json'), this.getIndexUrl())
    } catch (e) {
      console.warn('Failed to read the social state', e)
      this._state = new Schemas.SocialIndex({}, this.getIndexUrl())
    }
  }

  async _save () {
    return this.archive.writeFile('/index/citizen/social.json', JSON.stringify(this._state))    
  }

  async crawlSite (user, changes, opts) {
    var followerDomain = user.getDomainName()

    // has the profile.json changed?
    var needsIndex = false
    for (let change of changes) {
      if (change.path === '/profile.json') {
        needsIndex = true
      }
    }
    if (!needsIndex) {
      return
    }

    // fetch latest
    let follows = await user.listFollows()

    // feed index
    // NOTE this is pretty lazy (filter out, re/add, sort) but I'm not going to optimize this until I need to -prf
    if (opts.indexes.social.follows) {
      // remove all previously indexed data
      for (let url in this._state.followers) {
        this._state.followers[url] = this._state.followers[url].filter(d => d !== followerDomain)
      }

      for (let follow of follows) {
        let followedDomain
        try {
          followedDomain = toDomain(follow.url)
        } catch (e) {
          console.warn('Failed to index follow by', followerDomain, 'url:', follow.url)
          console.warn('Error:', e)
          continue
        }
        let followers = this._state.followers[followedDomain] = this._state.followers[followedDomain] || []
        if (followers.indexOf(followerDomain) === -1) {
          followers.push(followerDomain)
        }
      }
    }

    // write updated state
    await this._save()
  }

  async uncrawlSite (user) {
    var domain = user.getDomainName()

    // remove all previously indexed data
    for (let url in this._state.followers) {
      this._state.followers[url] = this._state.followers[url].filter(d => d !== domain)
    }

    // write updated state
    await this._save()
  }

  async listFollowers (url) {
    return deepClone(this._state.followers[toDomain(url)] || [])
  }

  async listFriends (url) {
    var targetDomain = toDomain(url)
    var followers = await this.listFollowers(targetDomain)
    var friends = []
    for (let followerDomain of followers) {
      if (await this.isFollowing(targetDomain, followerDomain)) {
        friends.push(followerDomain)
      }
    }
    return friends.filter(Boolean)
  }

  async isFollowing (urlSource, urlTarget) {
    var followers = this._state.followers[toDomain(urlTarget)] || []
    return followers.indexOf(toDomain(urlSource)) !== -1
  }

  async isFriends (urlA, urlB) {
    var arr = await Promise.all([
      this.isFollowing(urlA, urlB),
      this.isFollowing(urlB, urlA)
    ])
    return arr[0] && arr[1]
  }
}
