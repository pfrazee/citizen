/* globals DatArchive URL */

import {toUrl, ensureFolderExists, ignoreNotFound, deepClone} from './util.js'
import {User} from './user.js'
import * as Schemas from './schemas.js'

const POST_FILE_PATH_REGEX = /^\/posts\/[^\/]+\.json$/i

// exported api
// =

export class Index extends DatArchive {
  constructor (url) {
    super(toUrl(url))

    this.isEditable = false
    this.microblog = new MicroblogAPI(this)
  }

  async setup () {
    var info = await this.getInfo()
    this.isEditable = info.isOwner

    if (this.isEditable) {
      await ensureFolderExists(this, '/index')
    }

    await Promise.all([
      this.microblog.setup()
    ])
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
    return this.archive.url + '/index/microblog.json'
  }

  async setup () {
    await this._load()
    // TODO watch for changes to the index in other tabs
  }

  async _load () {
    try {
      this._state = new Schemas.MicroblogIndex(await this.archive.readFile('/index/microblog.json'), this.getIndexUrl())
    } catch (e) {
      console.warn('Failed to read the microblog state', e)
      this._state = new Schemas.MicroblogIndex({}, this.getIndexUrl())
    }
  }

  async _save () {
    return this.archive.writeFile('/index/microblog.json', JSON.stringify(this._state))    
  }

  async crawlSite (url, opts) {
    opts = new Schemas.MicroblogCrawlOpts(opts)
    var user = new User(url)
    var domain = user.getDomainName()
    var siteState = this._state.sites[domain]

    if (!siteState) {
      siteState = this._state.sites[domain] = {key: '', name: '', version: 0}
    }
    
    var key = await DatArchive.resolveName(domain)
    if (siteState && siteState.key !== key) { // key change
      // warn user
      // TODO

      // remove all previously indexed data
      let origin = `dat://${domain}/`
      this._state.feed = this._state.feed.filter(post => post.author !== domain)
      for (let threadUrl in this._state.threads) {
        this._state.threads[threadUrl] = this._state.threads[threadUrl].filter(url => {
          return !url.startsWith(origin)
        })
      }
    }

    // get a list of files that need indexing since last crawl()
    var version = siteState && typeof siteState.version === 'number' ? siteState.version : 0
    var changes = await user.history({start: version})
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

      // update version
      version = Math.max(version, changesToIndex[filename].version)

      if (changesToIndex[filename].type === 'del') {
        // no new data to index, remove only
        continue
      }

      // fetch latest
      let post = await user.microblog.get(filename)

      // feed index
      if (opts.indexes.feed) {
        if (!post.threadRoot && !post.threadParent) { // root posts only
          this._state.feed.push(Schemas.MicroblogIndex.postToFeedItem(post)) // add / readd
        }
      }

      // threads index
      if (opts.indexes.replies) {
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

    // update crawl state
    this._state.sites[domain] = {key, version}

    // write updated state
    await this._save()
  }

  async uncrawlSite (url) {
    // TODO
    throw new Error('uncrawlSite() Not yet implemented')
  }

  listCrawledSites () {
    return deepClone(this._state.sites)
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
