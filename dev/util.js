import {InvalidURLError} from './errors.js'

export function toUrl (v) {
  if (v && typeof v.url === 'string') {
    return v.url
  }
  if (v && typeof v.getUrl === 'function') {
    return v.getUrl()
  }
  if (typeof v === 'string') {
    if (v.indexOf('://') === -1) {
      v = 'dat://' + v
    }
    return v
  }
  if (v === window.location) {
    return v.toString()
  }
  throw new InvalidURLError(v)
}

export async function ensureFolderExists (archive, path) {
  try {
    await archive.mkdir(path)
  } catch (e) {
    if (e.entryAlreadyExists) {
      // make sure it's a folder
      let st = await archive.stat(path)
      if (st.isDirectory()) {
        return // we're all set
      }
    }
    // failed to setup directory, rethrow
    throw e
  }
}

export function ignoreNotFound (e) {
  if (e.notFound) {
    return null
  }
  throw e
}

export function deepClone (v) {
  if (!v) return v
  return JSON.parse(JSON.stringify(v))
}