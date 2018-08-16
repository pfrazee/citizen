/* globals DatArchive */

import {newId} from './new-id.js'
import {toUrl, toDomain, ensureFolderExists, ignoreNotFound} from './util.js'
import * as Schemas from './schemas.js'
import {NotTheOwnerError} from './errors.js'

// exported api
// =

export class User extends DatArchive {
  constructor (url) {
    url = toUrl(url)
    super(url)
    this.getDomainName = () => (new URL(url)).hostname

    this.microblog = new MicroblogAPI(this)
  }

  getProfileUrl () {
    return this.url + '/profile.json'
  }

  getAvatarUrl () {
    return this.url + '/avatar.png'
  }

  async setup () {
    var info = await this.getInfo()
    if (!info.isOwner) {
      throw new NotTheOwnerError()
    }
    await Promise.all([
      this.microblog.setup()
    ])
  }

  async getProfile () {
    // read file
    var profile = await this.readFile('/profile.json').catch(ignoreNotFound)
    return new Schemas.Profile(profile, this.getProfileUrl())
  }

  async setProfile (details) {
    // lock
    // TODO

    // read current
    var profile = await this.getProfile()

    // update
    for (var k in details) {
      profile[k] = details[k]
    }

    // write file
    profile = new Schemas.Profile(profile, this.getProfileUrl())
    await this.writeFile('/profile.json', JSON.stringify(profile))
  }

  async setAvatar ({data, format}) {
    // TODO
    throw new Error('setAvatar() Not yet implemented')
  }

  async follow (url, {name} = {}) {
    url = toDomain(url)

    // lock
    // TODO

    // read, update, write
    var profile = await this.getProfile()
    profile.follows = profile.follows.filter(f => f.url !== url)
    profile.follows.push({url, name})
    await this.setProfile(profile)
  }

  async unfollow (url) {
    url = toDomain(url)

    // lock
    // TODO

    // read, update, write
    var profile = await this.getProfile()
    profile.follows = profile.follows.filter(f => f.url !== url)
    await this.setProfile(profile)
  }

  async isFollowing (url) {
    var profile = await this.getProfile()
    return profile.follows.find(f => f.url === url)
  }

  async listFollows () {
    var profile = await this.getProfile()
    return profile.follows
  }
}

// internal methods
// =

class UserAPI {
  constructor (user) {
    this.user = user
  }

  async setup () {
    // should be overridden as needed
  }
}

class MicroblogAPI extends UserAPI {
  async setup () {
    await ensureFolderExists(this.user, '/posts')
  }

  generatePostFilename () {
    return newId() + '.json'
  }

  getPostUrl (filename) {
    return this.user.url + '/posts/' + filename
  }

  async list (query) {
    query = new Schemas.MicroblogPostsQuery(query)

    // read contents of /posts
    var names = await this.user.readdir('/posts')

    // apply pre-filter operations
    if (query.reverse) {
      names.reverse()
    }
    if (query.offset) {
      names = names.slice(query.offset)
    }

    // fetch post content if requested
    var posts
    if (query.includeContent) {
      posts = await Promise.all(names.map(this.get.bind(this)))
    } else {
      posts = names.map(name => new Schemas.MicroblogPost(null, this.getPostUrl(name)))
    }

    // content-based filters
    if (query.rootPostsOnly) {
      posts = posts.filter(post => !post.threadParent && !post.threadRoot)
    }

    // apply post-filter operations
    if (query.limit) {
      posts = posts.slice(0, query.limit)
    }

    return posts
  }

  async count (query) {
    return (await this.list(query)).length
  }

  async get (filename) {
    // read file
    var post = await this.user.readFile('/posts/' + filename)
    return new Schemas.MicroblogPost(post, this.getPostUrl(filename))
  }

  async add (details) {
    massagePostDetails(details)
    details.createdAt = details.createdAt || Date.now()

    // write to new file
    var filename = await this.generatePostFilename()
    var post = new Schemas.MicroblogPost(details, this.getPostUrl(filename))
    await this.user.writeFile('/posts/' + filename, JSON.stringify(post))
    return post
  }

  async edit (filename, details) {
    massagePostDetails(details)

    // lock region
    // TODO

    // read file
    var post = await this.get(filename)

    // update data
    for (var k in details) {
      post[k] = details[k]
    }

    // write file
    await this.user.writeFile('/posts/' + filename, JSON.stringify(post))
    return post
  }

  async remove (filename) {
    // delete file
    await this.user.unlink('/posts/' + filename)
  }
}

function massagePostDetails (details) {
  if (details.threadRoot && !details.threadParent) {
    details.threadParent = details.threadRoot
  }
  if (!details.threadRoot && details.threadParent) {
    details.threadRoot = details.threadParent
  }
  if (details.threadRoot) details.threadRoot = toUrl(details.threadRoot)
  if (details.threadParent) details.threadParent = toUrl(details.threadParent)
}
