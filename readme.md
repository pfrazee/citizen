# Citizen

A social web API for beaker/dat applications. Requires a Web browser which supports the Beaker/Dat stack (e.g. [Beaker browser](https://beakerbrowser.com)).

```js
// import the current dev build
import * as Citizen from 'dat://citizen.hashbase.io/dev/api.js'

// Citizen.User
// Citizen.Index
```

 - [Todos](./todos.md)
 - [Tests](dat://testify.hashbase.io/?test_url=dat://citizen.hashbase.io/dev/test/microblog.js)

## Citizen.User API

```js
var user = new Citizen.User(url)
await user.setup()

await user.getProfile()
await user.setProfile({name, bio})
await user.setAvatar({data, format})

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

await index.crawl(url, {
  indexes: {
    microblog: {
      feed: true,
      replies: true
    }
  }
})

index.microblog.listFeed({..})
index.microblog.getPost(url)
index.microblog.getThread(url)
```

## File structure

| path | schema | description |
|-|-|-|
| `/profile.json` | `Profile` | The user's profile information. |
| `/avatar.png` | - | The user's image. Should be a square between 100-600px in width/height. |
| `/posts/*.json` | `MicroblogPost` | The user's posts. The filename sort order will determine the list order. |
| `/indexes/microblog.json` | `MicroblogIndex` | The merged-microblog feed index. |

## File schemas

### Profile

User information.

| field | type | description |
|-|-|-|
| `name` | string | The user's name. |
| `bio` | string | A short description of the user. |

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

### MicroblogIndex

A combined view of multiple microblogs. Provides a feed view and thread pointers.

| field | type | description |
|-|-|-|
| `sites` | Object of domain => MicroblogIndexSite | Metadata regarding the indexed sites. |
| `feed` | Array of MicroblogIndexFeedPost | The indexed list of posts, ordered into a merged feed view. |
| `threads` | Object of url => Array of urls | A map of the known URLs which are replies to a given url. Generated from `threadRoot`. |

### MicroblogIndexSite

Metadata regarding a previously-indexed site.

| field | type | description |
|-|-|-|
| `key` | string | The resolved key of the dat. |
| `version` | string | The version of the dat which has been indexed. |

### MicroblogIndexFeedPost

A feed-index pointer to a post.

| field | type | description |
|-|-|-|
| `author` | string | The domain name of the author. |
| `filename` | string | The filename of the post. |
| `createdAt` | number | The creation timestamp of the original post. |
| `threadRoot` | string | If the post is a reply, this is the URL of the root post in the thread. |