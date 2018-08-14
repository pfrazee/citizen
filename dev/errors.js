class ExtendableError extends Error {
  constructor (msg) {
    super(msg)
    this.name = this.constructor.name
    this.message = msg
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor)
    } else {
      this.stack = (new Error(msg)).stack
    }
  }
}

export class JSONParseError extends ExtendableError {
  constructor (msg) {
    super(msg || 'Failed to parse JSON file')
    this.jsonParseError = true
  }
}

export class InvalidURLError extends ExtendableError {
  constructor (v) {
    super('Invalid URL: ' + v)
    this.invalidUrl = true
  }
}

export class NotTheOwnerError extends ExtendableError {
  constructor (v) {
    super('Cannot make changes: You are not the archive owner')
    this.notTheOwner = true
  }
}