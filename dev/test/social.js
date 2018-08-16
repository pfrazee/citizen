import {User} from '../user.js'
import {Index} from '../index.js'

export default function (test) {
  var user1
  var user2
  var user3
  var index

  test.section('Social API')

  test('create test users', async t => {
    user1 = new User(await t.createTemporaryDatArchive({
      title: 'Citizen Social Test (user 1)'
    }))
    await user1.setup()
    user2 = new User(await t.createTemporaryDatArchive({
      title: 'Citizen Social Test (user 2)'
    }))
    await user2.setup()
    user3 = new User(await t.createTemporaryDatArchive({
      title: 'Citizen Social Test (user 3)'
    }))
    await user3.setup()
    index = new Index(user1)
    await index.setup()
  })

  test.section('social - User class')

  test('write profiles', async t => {
    await user1.setProfile({
      name: 'Alice',
      bio: 'A cool hacker 1'
    })
    await user2.setProfile({
      name: 'Bob',
      bio: 'A cool hacker 2'
    })
    await user3.setProfile({
      name: 'Carla',
      bio: 'A cool hacker 3'
    })
  })

  test('follows', async t => {
    await user1.follow(user2, {name: 'Bob'})
    await user1.follow(user3, {name: 'Carla'})
    await user2.follow(user1, {name: 'Alice'})
    await user3.follow(user1)
    await user3.follow(user2)

    t.deepEqual(await user1.getProfile(), {
      name: 'Alice',
      bio: 'A cool hacker 1',
      follows: [{url: user2.getDomainName(), name: 'Bob'}, {url: user3.getDomainName(), name: 'Carla'}]
    })

    t.deepEqual(await user2.getProfile(), {
      name: 'Bob',
      bio: 'A cool hacker 2',
      follows: [{url: user1.getDomainName(), name: 'Alice'}]
    })

    t.deepEqual(await user3.getProfile(), {
      name: 'Carla',
      bio: 'A cool hacker 3',
      follows: [{url: user1.getDomainName(), name: false}, {url: user2.getDomainName(), name: false}]
    })
  })

  test('unfollow', async t => {
    await user2.unfollow(user1)

    t.deepEqual(await user2.getProfile(), {
      name: 'Bob',
      bio: 'A cool hacker 2',
      follows: []
    })

    await user2.follow(user1, {name: 'Alice'})

    t.deepEqual(await user2.getProfile(), {
      name: 'Bob',
      bio: 'A cool hacker 2',
      follows: [{url: user1.getDomainName(), name: 'Alice'}]
    })
  })

  test('follow does an update if already exists', async t => {
    await user2.follow(user1, {name: 'Alicia'})

    t.deepEqual(await user2.getProfile(), {
      name: 'Bob',
      bio: 'A cool hacker 2',
      follows: [{url: user1.getDomainName(), name: 'Alicia'}]
    })

    await user2.follow(user1, {name: 'Alice'})
  })

  test('setProfile doesnt nuke follows', async t => {
    await user1.setProfile({bio: 'A *very* cool hacker 1'})

    t.deepEqual(await user1.getProfile(), {
      name: 'Alice',
      bio: 'A *very* cool hacker 1',
      follows: [{url: user2.getDomainName(), name: 'Bob'}, {url: user3.getDomainName(), name: 'Carla'}]
    })
  })

  test.section('social - Index class')

  test('crawl', async t => {
    await index.crawlSite(user1)
    await index.crawlSite(user2)
    await index.crawlSite(user3)
  })

  test('listFollowers', async t => {
    t.deepEqual(await index.social.listFollowers(user1), [
      user2.getDomainName(),
      user3.getDomainName()
    ])

    t.deepEqual(await index.social.listFollowers(user2), [
      user1.getDomainName(),
      user3.getDomainName()
    ])

    t.deepEqual(await index.social.listFollowers(user3), [
      user1.getDomainName()
    ])
  })

  test('listFriends', async t => {
    t.deepEqual(await index.social.listFriends(user1), [
      user2.getDomainName(),
      user3.getDomainName()
    ])

    t.deepEqual(await index.social.listFriends(user2), [
      user1.getDomainName()
    ])

    t.deepEqual(await index.social.listFriends(user3), [
      user1.getDomainName()
    ])
  })

  test('isFollowing', async t => {
    t.equal(await index.social.isFollowing(user1, user2), true)
    t.equal(await index.social.isFollowing(user1, user3), true)
    t.equal(await index.social.isFollowing(user2, user1), true)
    t.equal(await index.social.isFollowing(user2, user3), false)
    t.equal(await index.social.isFollowing(user3, user1), true)
    t.equal(await index.social.isFollowing(user3, user2), true)
  })

  test('isFriends', async t => {
    t.equal(await index.social.isFriends(user1, user2), true)
    t.equal(await index.social.isFriends(user1, user3), true)
    t.equal(await index.social.isFriends(user2, user1), true)
    t.equal(await index.social.isFriends(user2, user3), false)
    t.equal(await index.social.isFriends(user3, user1), true)
    t.equal(await index.social.isFriends(user3, user2), false)
  })

  test('do some unfollowing and crawl again', async t => {
    await user2.unfollow(user1)
    await user3.unfollow(user1)

    await index.crawlSite(user1)
    await index.crawlSite(user2)
    await index.crawlSite(user3)
  })

  test('listFollowers', async t => {
    t.deepEqual(await index.social.listFollowers(user1), [])

    t.deepEqual(await index.social.listFollowers(user2), [
      user1.getDomainName(),
      user3.getDomainName()
    ])

    t.deepEqual(await index.social.listFollowers(user3), [
      user1.getDomainName()
    ])
  })

  test('listFriends', async t => {
    t.deepEqual(await index.social.listFriends(user1), [])

    t.deepEqual(await index.social.listFriends(user2), [])

    t.deepEqual(await index.social.listFriends(user3), [])
  })

  test('isFollowing', async t => {
    t.equal(await index.social.isFollowing(user1, user2), true)
    t.equal(await index.social.isFollowing(user1, user3), true)
    t.equal(await index.social.isFollowing(user2, user1), false)
    t.equal(await index.social.isFollowing(user2, user3), false)
    t.equal(await index.social.isFollowing(user3, user1), false)
    t.equal(await index.social.isFollowing(user3, user2), true)
  })

  test('isFriends', async t => {
    t.equal(await index.social.isFriends(user1, user2), false)
    t.equal(await index.social.isFriends(user1, user3), false)
    t.equal(await index.social.isFriends(user2, user1), false)
    t.equal(await index.social.isFriends(user2, user3), false)
    t.equal(await index.social.isFriends(user3, user1), false)
    t.equal(await index.social.isFriends(user3, user2), false)
  })

  test('restore some follows, crawl again, but uncrawl user3', async t => {
    await user2.follow(user1)
    await user3.follow(user1)

    await index.crawlSite(user1)
    await index.crawlSite(user2)
    await index.uncrawlSite(user3)
  })

  test('listFollowers', async t => {
    t.deepEqual(await index.social.listFollowers(user1), [user2.getDomainName()])
    t.deepEqual(await index.social.listFollowers(user2), [user1.getDomainName()])
    t.deepEqual(await index.social.listFollowers(user3), [user1.getDomainName()])
  })

  test('listFriends', async t => {
    t.deepEqual(await index.social.listFriends(user1), [user2.getDomainName()])
    t.deepEqual(await index.social.listFriends(user2), [user1.getDomainName()])
    t.deepEqual(await index.social.listFriends(user3), [])
  })

  test('isFollowing', async t => {
    t.equal(await index.social.isFollowing(user1, user2), true)
    t.equal(await index.social.isFollowing(user1, user3), true)
    t.equal(await index.social.isFollowing(user2, user1), true)
    t.equal(await index.social.isFollowing(user2, user3), false)
    t.equal(await index.social.isFollowing(user3, user1), false)
    t.equal(await index.social.isFollowing(user3, user2), false)
  })

  test('isFriends', async t => {
    t.equal(await index.social.isFriends(user1, user2), true)
    t.equal(await index.social.isFriends(user1, user3), false)
    t.equal(await index.social.isFriends(user2, user1), true)
    t.equal(await index.social.isFriends(user2, user3), false)
    t.equal(await index.social.isFriends(user3, user1), false)
    t.equal(await index.social.isFriends(user3, user2), false)
  })
}
