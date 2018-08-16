# Citizen

A social web API for beaker/dat applications. Requires a Web browser which supports the Beaker/Dat stack (e.g. [Beaker browser](https://beakerbrowser.com)).

```js
// import the current dev build
import * as Citizen from 'dat://citizen.hashbase.io/dev/api.js'

// Citizen.User
// Citizen.Index
```

 - [Todos](./todos.md)
 - [Tests](dat://testify.hashbase.io/?test_url=dat://citizen.hashbase.io/dev/test/index.js)

## Citizen.User API

```js
var user = new Citizen.User(url)
await user.setup()

await user.getProfile()
await user.setProfile({name, bio})
await user.setAvatar({data, format}) // not yet implemented

await user.follow(url, {name})
await user.unfollow(url)
await user.isFollowing(url)
await user.listFollows()

await user.microblog.list({..})
await user.microblog.count({..})
await user.microblog.get(id)
await user.microblog.add({type, ..})
await user.microblog.edit(id, {type, ..})
await user.microblog.remove(id)
```

## Citizen.Index API

```js
var index = new Citizen.Index(url)
await index.setup()

// crawler controls

await index.crawlSite(url, {
  indexes: {
    microblog: {
      feed: true,
      replies: true
    },
    social: {
      follows: true
    }
  }
})
await index.uncrawlSite(url)
index.listCrawledSites()
index.getCrawledSite(domain)

// microblog index

await index.microblog.listFeed({..})
await index.microblog.getPost(url)
await index.microblog.getThread(url)

// social index

await index.social.listFollowers(url)
await index.social.listFriends(url)
await index.social.isFollowing(urlSource, urlTarget)
await index.social.isFriends(urlA, urlB)
```

## File structure

| path | schema | description |
|-|-|-|
| `/profile.json` | `Profile` | The user's profile information. |
| `/avatar.png` | - | The user's image. Should be a square between 100-600px in width/height. |
| `/posts/*.json` | `MicroblogPost` | The user's posts. The filename sort order will determine the list order. |
| `/indexes/citizen.json` | `CitizenIndex` | The top-level index metadata. |
| `/indexes/citizen/microblog.json` | `MicroblogIndex` | The merged-microblog feed index. |
| `/indexes/citizen/social.json` | `SocialIndex` | The social-graph index. |

## File schemas

### Profile

User information.

| field | type | description |
|-|-|-|
| `name` | string | The user's name. |
| `bio` | string | A short description of the user. |
| `follows` | Array of ProfileFollow | The list of accounts that this user follows. |

### ProfileFollow

Information about a followed user.

| field | type | description |
|-|-|-|
| `url` | string | The url of the followed user. |
| `name` | string | The profile name of the followed user. (Optional.) |

### MicroblogPost

A microblog post.

| field | type | description |
|-|-|-|
| `type` | string | What kind of post? Default "text". |
| `text` | string | The text of the post. |
| `threadRoot` | string | If the post is a reply, this is the URL of the root post in the thread. |
| `threadParent` | string | If the post is a reply, this is the URL of the immediate parent in the thread. |
| `createdAt` | number | The creation timestamp. |
| `mentions` | Array of MicroblogPostMention | Users mentioned in the post. |

### MicroblogPostMention

A user-mention inside a `MicroblogPost`.

| field | type | description |
|-|-|-|
| `url` | string | The URL of the mentioned user. |
| `name` | string | The name of the mentioned user. |

### CitizenIndex

Top-level metadata about the indexes.

| field | type | description |
|-|-|-|
| `sites` | Object of domain => CitizenIndexSite | Metadata regarding the indexed sites. |

### CitizenIndexSite

Metadata regarding a previously-indexed site.

| field | type | description |
|-|-|-|
| `key` | string | The resolved key of the dat. |
| `version` | string | The version of the dat which has been indexed. |
| `name` | string | The profile name of the site. |

### MicroblogIndex

A combined view of multiple microblogs. Provides a feed view and thread pointers.

| field | type | description |
|-|-|-|
| `feed` | Array of MicroblogIndexFeedPost | The indexed list of posts, ordered into a merged feed view. |
| `threads` | Object of url => Array of urls | A map of the known URLs which are replies to a given url. Generated from `threadRoot`. |

### MicroblogIndexFeedPost

A feed-index pointer to a post.

| field | type | description |
|-|-|-|
| `author` | string | The domain name of the author. |
| `filename` | string | The filename of the post. |
| `createdAt` | number | The creation timestamp of the original post. |
| `threadRoot` | string | If the post is a reply, this is the URL of the root post in the thread. |

### SocialIndex

The social-graph index.

| field | type | description |
|-|-|-|
| `followers` | Object of url => Array of urls | A map of "follower" relationships. Each entry is an array of users following the entry's key. |