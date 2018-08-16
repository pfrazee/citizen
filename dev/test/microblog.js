import {User} from '../user.js'
import {Index} from '../index.js'

export default function (test) {
  var testUserArchive
  var user
  var user2
  var index

  test.section('Microblog API')

  test('create test user', async t => {
    testUserArchive = await t.createTemporaryDatArchive({
      title: 'Test user archive'
    })
    user = new User(testUserArchive)
    await user.setup()
    index = new Index(testUserArchive)
    await index.setup()
  })

  test.section('microblog - User class')

  test('read/write profile', async t => {
    var profile = await user.getProfile()
    t.deepEqual(profile, {
      name: '',
      bio: '',
      follows: []
    }, 'Empty profile')

    await user.setProfile({
      name: 'Alice',
      bio: 'A cool hacker girl'
    })

    var profile = await user.getProfile()
    t.deepEqual(profile, {
      name: 'Alice',
      bio: 'A cool hacker girl',
      follows: []
    }, 'Updated profile')
  })

  test.skip('set avatar', async t => {
    // TODO
  })

  test('microblog.list() empty', async t => {
    t.deepEqual(await user.microblog.list(), [], 'Empty list')
  })

  test('microblog.add()', async t => {
    var post1 = await user.microblog.add({text: 'Hello world'})
    var post2 = await user.microblog.add({text: 'Post 2'})
    var post3 = await user.microblog.add({text: 'Post 3'})
    var post1reply1 = await user.microblog.add({text: 'Reply 1', threadRoot: post1.getUrl()})
    var post1reply2 = await user.microblog.add({text: 'Reply 2', threadParent: post1.getUrl()})
    var post1reply1reply1 = await user.microblog.add({text: 'Reply 1 Reply 1', threadRoot: post1, threadParent: post1reply1})
  })

  test('microblog.list()', async t => {
    var postsList = await user.microblog.list()
    t.deepEqual(postsList.map(extractPost), [
      { type: 'text', text: 'Hello world', hasThreadRoot: false, hasThreadParent: false, hasCreatedAt: true },
      { type: 'text', text: 'Post 2', hasThreadRoot: false, hasThreadParent: false, hasCreatedAt: true },
      { type: 'text', text: 'Post 3', hasThreadRoot: false, hasThreadParent: false, hasCreatedAt: true },
      { type: 'text', text: 'Reply 1', hasThreadRoot: true, hasThreadParent: true, hasCreatedAt: true },
      { type: 'text', text: 'Reply 2', hasThreadRoot: true, hasThreadParent: true, hasCreatedAt: true },
      { type: 'text', text: 'Reply 1 Reply 1', hasThreadRoot: true, hasThreadParent: true, hasCreatedAt: true }
    ], 'list() reads correctly')
    for (let post of postsList) {
      t.assert(post.getUrl().startsWith(user.url), 'Has correct url')
    }
  })

  test('microblog.list({includeContent: false})', async t => {
    var postsList = await user.microblog.list({includeContent: false})
    t.deepEqual(postsList, [
      { type: 'text', text: '', threadRoot: false, threadParent: false, createdAt: 0 },
      { type: 'text', text: '', threadRoot: false, threadParent: false, createdAt: 0 },
      { type: 'text', text: '', threadRoot: false, threadParent: false, createdAt: 0 },
      { type: 'text', text: '', threadRoot: false, threadParent: false, createdAt: 0 },
      { type: 'text', text: '', threadRoot: false, threadParent: false, createdAt: 0 },
      { type: 'text', text: '', threadRoot: false, threadParent: false, createdAt: 0 }
    ], 'list() reads correctly')
    for (let post of postsList) {
      t.assert(post.getUrl().startsWith(user.url), 'Has correct url')
    }
  })

  test('microblog.list({rootPostsOnly: true})', async t => {
    var postsList = await user.microblog.list({rootPostsOnly: true})
    t.deepEqual(postsList.map(extractPost), [
      { type: 'text', text: 'Hello world', hasThreadRoot: false, hasThreadParent: false, hasCreatedAt: true },
      { type: 'text', text: 'Post 2', hasThreadRoot: false, hasThreadParent: false, hasCreatedAt: true },
      { type: 'text', text: 'Post 3', hasThreadRoot: false, hasThreadParent: false, hasCreatedAt: true }
    ], 'list() reads correctly')
  })

  test('microblog.list({offset: 3})', async t => {
    var postsList = await user.microblog.list({offset: 3})
    t.deepEqual(postsList.map(extractPost), [
      { type: 'text', text: 'Reply 1', hasThreadRoot: true, hasThreadParent: true, hasCreatedAt: true },
      { type: 'text', text: 'Reply 2', hasThreadRoot: true, hasThreadParent: true, hasCreatedAt: true },
      { type: 'text', text: 'Reply 1 Reply 1', hasThreadRoot: true, hasThreadParent: true, hasCreatedAt: true }
    ], 'list() reads correctly')
  })

  test('microblog.list({limit: 3})', async t => {
    var postsList = await user.microblog.list({limit: 3})
    t.deepEqual(postsList.map(extractPost), [
      { type: 'text', text: 'Hello world', hasThreadRoot: false, hasThreadParent: false, hasCreatedAt: true },
      { type: 'text', text: 'Post 2', hasThreadRoot: false, hasThreadParent: false, hasCreatedAt: true },
      { type: 'text', text: 'Post 3', hasThreadRoot: false, hasThreadParent: false, hasCreatedAt: true }
    ], 'list() reads correctly')
  })

  test('microblog.list({offset: 1, limit: 3})', async t => {
    var postsList = await user.microblog.list({offset: 1, limit: 3})
    t.deepEqual(postsList.map(extractPost), [
      { type: 'text', text: 'Post 2', hasThreadRoot: false, hasThreadParent: false, hasCreatedAt: true },
      { type: 'text', text: 'Post 3', hasThreadRoot: false, hasThreadParent: false, hasCreatedAt: true },
      { type: 'text', text: 'Reply 1', hasThreadRoot: true, hasThreadParent: true, hasCreatedAt: true }
    ], 'list() reads correctly')
  })

  test('microblog.list({offset: 1, limit: 3, rootPostsOnly: true})', async t => {
    var postsList = await user.microblog.list({offset: 1, limit: 3, rootPostsOnly: true})
    t.deepEqual(postsList.map(extractPost), [
      { type: 'text', text: 'Post 2', hasThreadRoot: false, hasThreadParent: false, hasCreatedAt: true },
      { type: 'text', text: 'Post 3', hasThreadRoot: false, hasThreadParent: false, hasCreatedAt: true }
    ], 'list() reads correctly')
  })

  test('microblog.list({reverse: true})', async t => {
    var postsList = await user.microblog.list({reverse: true})
    t.deepEqual(postsList.map(extractPost), [
      { type: 'text', text: 'Reply 1 Reply 1', hasThreadRoot: true, hasThreadParent: true, hasCreatedAt: true },
      { type: 'text', text: 'Reply 2', hasThreadRoot: true, hasThreadParent: true, hasCreatedAt: true },
      { type: 'text', text: 'Reply 1', hasThreadRoot: true, hasThreadParent: true, hasCreatedAt: true },
      { type: 'text', text: 'Post 3', hasThreadRoot: false, hasThreadParent: false, hasCreatedAt: true },
      { type: 'text', text: 'Post 2', hasThreadRoot: false, hasThreadParent: false, hasCreatedAt: true },
      { type: 'text', text: 'Hello world', hasThreadRoot: false, hasThreadParent: false, hasCreatedAt: true },
    ], 'list() reads correctly')
  })

  test('microblog.list({offset: 1, limit: 3, reverse: true})', async t => {
    var postsList = await user.microblog.list({offset: 1, limit: 3, reverse: true})
    t.deepEqual(postsList.map(extractPost), [
      { type: 'text', text: 'Reply 2', hasThreadRoot: true, hasThreadParent: true, hasCreatedAt: true },
      { type: 'text', text: 'Reply 1', hasThreadRoot: true, hasThreadParent: true, hasCreatedAt: true },
      { type: 'text', text: 'Post 3', hasThreadRoot: false, hasThreadParent: false, hasCreatedAt: true }
    ], 'list() reads correctly')
  })

  test('microblog.get()', async t => {
    var postsList = await user.microblog.list()
    t.equal(postsList.length, 6)
    for (let i = 0; i < 6; i++) {
      let post = postsList[i]
      let post2 = await user.microblog.get(post.getFilename())
      t.deepEqual(post, post2)
    }
  })

  test('microblog.get() not found', async t => {
    await t.throwsAsync(() => user.microblog.get('fake'))
  })

  test('microblog.edit()', async t => {
    var postsList = await user.microblog.list()
    await user.microblog.edit(postsList[0].getFilename(), {text: 'Hello world!!'})
    
    var post = await user.microblog.get(postsList[0].getFilename())
    t.equal(post.text, 'Hello world!!')
  })

  test('microblog.edit() not found', async t => {
    await t.throwsAsync(() => user.microblog.edit('fake', {text: 'Hi!!'}))
  })

  test('microblog.remove()', async t => {
    var postsList = await user.microblog.list()
    t.equal(postsList.length, 6)

    await user.microblog.remove(postsList[1].getFilename())
    
    postsList = await user.microblog.list()
    t.equal(postsList.length, 5)
  })

  test('microblog.remove() not found', async t => {
    await t.throwsAsync(() => user.microblog.remove('fake'))
  })

  test.section('microblog - Index class')

  test('microblog.listFeed() empty', async t => {
    t.deepEqual(await index.microblog.listFeed(), [], 'Empty list')
  })

  test('crawl', async t => {
    await index.crawlSite(user)
  })

  test('microblog.listFeed()', async t => {
    var feed = await index.microblog.listFeed()
    t.deepEqual(feed.map(extractFeedPost), [
      {
        author: user.url.slice('dat://'.length),
        hasFilename: true,
        hasCreatedAt: true,
        hasThreadRoot: false,
        post: {
          type: 'text',
          text: 'Post 2',
          hasThreadRoot: false,
          hasThreadParent: false,
          hasCreatedAt: true
        }
      },
      {
        author: user.url.slice('dat://'.length),
        hasFilename: true,
        hasCreatedAt: true,
        hasThreadRoot: false,
        post: {
          type: 'text',
          text: 'Hello world!!',
          hasThreadRoot: false,
          hasThreadParent: false,
          hasCreatedAt: true
        }
      }
    ], 'listFeed()')
  })

  test('microblog.listFeed({includeContent: false})', async t => {
    var feed = await index.microblog.listFeed({includeContent: false})
    t.deepEqual(feed.map(extractFeedPost), [
      {
        author: user.url.slice('dat://'.length),
        hasFilename: true,
        hasCreatedAt: true,
        hasThreadRoot: false,
        post: false
      },
      {
        author: user.url.slice('dat://'.length),
        hasFilename: true,
        hasCreatedAt: true,
        hasThreadRoot: false,
        post: false
      }
    ], 'listFeed()')
  })

  test('microblog.listFeed({offset: 1})', async t => {
    var feed = await index.microblog.listFeed({offset: 1})
    t.deepEqual(feed.map(extractFeedPost), [
      {
        author: user.url.slice('dat://'.length),
        hasFilename: true,
        hasCreatedAt: true,
        hasThreadRoot: false,
        post: {
          type: 'text',
          text: 'Hello world!!',
          hasThreadRoot: false,
          hasThreadParent: false,
          hasCreatedAt: true
        }
      }
    ], 'listFeed()')
  })

  test('microblog.listFeed({limit: 1})', async t => {
    var feed = await index.microblog.listFeed({limit: 1})
    t.deepEqual(feed.map(extractFeedPost), [
      {
        author: user.url.slice('dat://'.length),
        hasFilename: true,
        hasCreatedAt: true,
        hasThreadRoot: false,
        post: {
          type: 'text',
          text: 'Post 2',
          hasThreadRoot: false,
          hasThreadParent: false,
          hasCreatedAt: true
        }
      }
    ], 'listFeed()')
  })

  test('microblog.listFeed({offset: 1, limit: 1})', async t => {
    var feed = await index.microblog.listFeed({offset: 1, limit: 1})
    t.deepEqual(feed.map(extractFeedPost), [], 'listFeed()')
  })

  test('microblog.listFeed({reverse: true})', async t => {
    var feed = await index.microblog.listFeed({reverse: true})
    t.deepEqual(feed.map(extractFeedPost), [
      {
        author: user.url.slice('dat://'.length),
        hasFilename: true,
        hasCreatedAt: true,
        hasThreadRoot: false,
        post: {
          type: 'text',
          text: 'Hello world!!',
          hasThreadRoot: false,
          hasThreadParent: false,
          hasCreatedAt: true
        }
      },
      {
        author: user.url.slice('dat://'.length),
        hasFilename: true,
        hasCreatedAt: true,
        hasThreadRoot: false,
        post: {
          type: 'text',
          text: 'Post 2',
          hasThreadRoot: false,
          hasThreadParent: false,
          hasCreatedAt: true
        }
      }
    ], 'listFeed()')
  })

  test('microblog.listFeed({reverse: true, offset: 1})', async t => {
    var feed = await index.microblog.listFeed({reverse: true, offset: 1})
    t.deepEqual(feed.map(extractFeedPost), [
      {
        author: user.url.slice('dat://'.length),
        hasFilename: true,
        hasCreatedAt: true,
        hasThreadRoot: false,
        post: {
          type: 'text',
          text: 'Post 2',
          hasThreadRoot: false,
          hasThreadParent: false,
          hasCreatedAt: true
        }
      }
    ], 'listFeed()')
  })

  test('microblog.listFeed({after:})', async t => {
    var postsList = await user.microblog.list({rootPostsOnly: true})
    var feed = await index.microblog.listFeed({after: postsList[1].createdAt})
    t.deepEqual(feed.map(extractFeedPost), [
      {
        author: user.url.slice('dat://'.length),
        hasFilename: true,
        hasCreatedAt: true,
        hasThreadRoot: false,
        post: {
          type: 'text',
          text: 'Post 2',
          hasThreadRoot: false,
          hasThreadParent: false,
          hasCreatedAt: true
        }
      }
    ], 'listFeed()')
  })

  test('microblog.listFeed({before:})', async t => {
    var postsList = await user.microblog.list({rootPostsOnly: true})
    var feed = await index.microblog.listFeed({before: postsList[0].createdAt})
    t.deepEqual(feed.map(extractFeedPost), [
      {
        author: user.url.slice('dat://'.length),
        hasFilename: true,
        hasCreatedAt: true,
        hasThreadRoot: false,
        post: {
          type: 'text',
          text: 'Hello world!!',
          hasThreadRoot: false,
          hasThreadParent: false,
          hasCreatedAt: true
        }
      }
    ], 'listFeed()')
  })

  test('microblog.listFeed({after:, before:})', async t => {
    var postsList = await user.microblog.list({rootPostsOnly: true})
    var feed = await index.microblog.listFeed({after: postsList[1].createdAt, before: postsList[0].createdAt})
    t.deepEqual(feed.map(extractFeedPost), [], 'listFeed()')
    var feed = await index.microblog.listFeed({after: postsList[1].createdAt - 1, before: postsList[0].createdAt + 1})
    t.deepEqual(feed.map(extractFeedPost), [
      {
        author: user.url.slice('dat://'.length),
        hasFilename: true,
        hasCreatedAt: true,
        hasThreadRoot: false,
        post: {
          type: 'text',
          text: 'Post 2',
          hasThreadRoot: false,
          hasThreadParent: false,
          hasCreatedAt: true
        }
      },
      {
        author: user.url.slice('dat://'.length),
        hasFilename: true,
        hasCreatedAt: true,
        hasThreadRoot: false,
        post: {
          type: 'text',
          text: 'Hello world!!',
          hasThreadRoot: false,
          hasThreadParent: false,
          hasCreatedAt: true
        }
      }
    ], 'listFeed()')
  })

  test('microblog.listFeed({after:, before:, limit: 1})', async t => {
    var postsList = await user.microblog.list({rootPostsOnly: true})
    var feed = await index.microblog.listFeed({after: postsList[1].createdAt - 1, before: postsList[0].createdAt + 1, limit: 1})
    t.deepEqual(feed.map(extractFeedPost), [
      {
        author: user.url.slice('dat://'.length),
        hasFilename: true,
        hasCreatedAt: true,
        hasThreadRoot: false,
        post: {
          type: 'text',
          text: 'Post 2',
          hasThreadRoot: false,
          hasThreadParent: false,
          hasCreatedAt: true
        }
      }
    ], 'listFeed()')
  })

  test('microblog.getThread()', async t => {
    var postsList = await user.microblog.list({rootPostsOnly: true, reverse: true})

    // at root
    var thread = await index.microblog.getThread(postsList[0])
    t.equal(thread.text, 'Hello world!!')
    t.equal(thread.replies[0].text, 'Reply 1')
    t.equal(thread.replies[1].text, 'Reply 2')
    t.equal(thread.replies[0].replies[0].text, 'Reply 1 Reply 1')
    t.equal(thread.replies[0].replies[0].root, thread)
    t.equal(thread.replies[0].replies[0].parent, thread.replies[0])

    // at reply
    var thread2 = await index.microblog.getThread(thread.replies[0])
    t.equal(thread2.text, 'Reply 1')
    t.equal(thread2.parent.text, 'Hello world!!')
    t.equal(thread2.replies[0].text, 'Reply 1 Reply 1')
  })

  test('create new test user', async t => {
    var testUserArchive2 = await t.createTemporaryDatArchive({
      title: 'Test user archive 2'
    })
    user2 = new User(testUserArchive2)
    await user2.setup()

    var postsList = await user.microblog.list({rootPostsOnly: true, reverse: true})
    var user2post1 = await user2.microblog.add({text: 'User2 Post 1'})
    await user2.microblog.add({text: 'User2 Reply 1', threadRoot: postsList[0]})
    await user.microblog.add({text: 'User1 Reply 1', threadRoot: user2post1})
  })

  test('crawl() both users', async t => {
    await Promise.all([
      await index.crawlSite(user),
      await index.crawlSite(user2)
    ])

    var sites = index.listCrawledSites()

    var user1key = user.url.slice('dat://'.length)
    t.deepEqual(sites[user1key], {
      key: user1key,
      name: 'Alice',
      version: 17
    })
    
    var user2key = user2.url.slice('dat://'.length)
    t.deepEqual(sites[user2key], {
      key: user2key,
      name: '',
      version: 5
    })
  })

  test('microblog.listFeed()', async t => {
    var feed = await index.microblog.listFeed()
    t.deepEqual(feed.map(extractFeedPost), [
      {
        author: user2.url.slice('dat://'.length),
        hasFilename: true,
        hasCreatedAt: true,
        hasThreadRoot: false,
        post: {
          type: 'text',
          text: 'User2 Post 1',
          hasThreadRoot: false,
          hasThreadParent: false,
          hasCreatedAt: true
        }
      },
      {
        author: user.url.slice('dat://'.length),
        hasFilename: true,
        hasCreatedAt: true,
        hasThreadRoot: false,
        post: {
          type: 'text',
          text: 'Post 2',
          hasThreadRoot: false,
          hasThreadParent: false,
          hasCreatedAt: true
        }
      },
      {
        author: user.url.slice('dat://'.length),
        hasFilename: true,
        hasCreatedAt: true,
        hasThreadRoot: false,
        post: {
          type: 'text',
          text: 'Hello world!!',
          hasThreadRoot: false,
          hasThreadParent: false,
          hasCreatedAt: true
        }
      }
    ], 'listFeed()')
  })

  test('microblog.getThread()', async t => {
    var postsList = await user.microblog.list({rootPostsOnly: true, reverse: true})
    var postsList2 = await user2.microblog.list({rootPostsOnly: true, reverse: true})

    var thread = await index.microblog.getThread(postsList[0])
    t.equal(thread.text, 'Hello world!!')
    t.equal(thread.replies[0].text, 'Reply 1')
    t.equal(thread.replies[1].text, 'Reply 2')
    t.equal(thread.replies[2].text, 'User2 Reply 1')
    t.equal(thread.replies[0].replies[0].text, 'Reply 1 Reply 1')
    t.equal(thread.replies[0].replies[0].root, thread)
    t.equal(thread.replies[0].replies[0].parent, thread.replies[0])

    var thread = await index.microblog.getThread(postsList2[0])
    t.equal(thread.text, 'User2 Post 1')
    t.equal(thread.replies[0].text, 'User1 Reply 1')
  })

  test('reopen index', async t => {
    index = new Index(testUserArchive)
    await index.setup()

    var feed = await index.microblog.listFeed()
    t.deepEqual(feed.map(extractFeedPost), [
      {
        author: user2.url.slice('dat://'.length),
        hasFilename: true,
        hasCreatedAt: true,
        hasThreadRoot: false,
        post: {
          type: 'text',
          text: 'User2 Post 1',
          hasThreadRoot: false,
          hasThreadParent: false,
          hasCreatedAt: true
        }
      },
      {
        author: user.url.slice('dat://'.length),
        hasFilename: true,
        hasCreatedAt: true,
        hasThreadRoot: false,
        post: {
          type: 'text',
          text: 'Post 2',
          hasThreadRoot: false,
          hasThreadParent: false,
          hasCreatedAt: true
        }
      },
      {
        author: user.url.slice('dat://'.length),
        hasFilename: true,
        hasCreatedAt: true,
        hasThreadRoot: false,
        post: {
          type: 'text',
          text: 'Hello world!!',
          hasThreadRoot: false,
          hasThreadParent: false,
          hasCreatedAt: true
        }
      }
    ], 'listFeed()')

    var thread = await index.microblog.getThread(feed[feed.length - 1].post)
    t.equal(thread.text, 'Hello world!!')
    t.equal(thread.replies[0].text, 'Reply 1')
    t.equal(thread.replies[1].text, 'Reply 2')
    t.equal(thread.replies[2].text, 'User2 Reply 1')
    t.equal(thread.replies[0].replies[0].text, 'Reply 1 Reply 1')
    t.equal(thread.replies[0].replies[0].root, thread)
    t.equal(thread.replies[0].replies[0].parent, thread.replies[0])
  })

  test('uncrawl', async t => {
    await index.uncrawlSite(user2.url)

    var sites = index.listCrawledSites()
    t.equal(Object.keys(sites).length, 1)

    var user1key = user.url.slice('dat://'.length)
    t.deepEqual(sites[user1key], {
      key: user1key,
      name: 'Alice',
      version: 17
    })
    
    var feed = await index.microblog.listFeed()
    t.deepEqual(feed.map(extractFeedPost), [
      {
        author: user.url.slice('dat://'.length),
        hasFilename: true,
        hasCreatedAt: true,
        hasThreadRoot: false,
        post: {
          type: 'text',
          text: 'Post 2',
          hasThreadRoot: false,
          hasThreadParent: false,
          hasCreatedAt: true
        }
      },
      {
        author: user.url.slice('dat://'.length),
        hasFilename: true,
        hasCreatedAt: true,
        hasThreadRoot: false,
        post: {
          type: 'text',
          text: 'Hello world!!',
          hasThreadRoot: false,
          hasThreadParent: false,
          hasCreatedAt: true
        }
      }
    ], 'listFeed()')

    var thread = await index.microblog.getThread(feed[feed.length - 1].post)
    t.equal(thread.text, 'Hello world!!')
    t.equal(thread.replies[0].text, 'Reply 1')
    t.equal(thread.replies[1].text, 'Reply 2')
    t.equal(thread.replies[2], undefined)
    t.equal(thread.replies[0].replies[0].text, 'Reply 1 Reply 1')
    t.equal(thread.replies[0].replies[0].root, thread)
    t.equal(thread.replies[0].replies[0].parent, thread.replies[0])
  })
}

function extractPost (post) {
  return {
    type: post.type,
    text: post.text,
    hasThreadRoot: !!post.threadRoot,
    hasThreadParent: !!post.threadParent,
    hasCreatedAt: post.createdAt && typeof post.createdAt === 'number'
  }
}

function extractFeedPost (feedPost) {
  return {
    author: feedPost.author,
    hasFilename: feedPost.filename && typeof feedPost.filename === 'string',
    hasCreatedAt: feedPost.createdAt && typeof feedPost.createdAt === 'number',
    hasThreadRoot: feedPost.threadRoot && typeof feedPost.threadRoot === 'string',
    post: feedPost.post ? extractPost(feedPost.post) : false
  }
}