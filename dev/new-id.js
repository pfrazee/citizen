// https://github.com/dominictarr/monotonic-timestamp
// Copyright (c) 2012 'Dominic Tarr'

// Permission is hereby granted, free of charge,
// to any person obtaining a copy of this software and
// associated documentation files (the "Software"), to
// deal in the Software without restriction, including
// without limitation the rights to use, copy, modify,
// merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom
// the Software is furnished to do so,
// subject to the following conditions:

// The above copyright notice and this permission notice
// shall be included in all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
// OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
// IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR
// ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
// TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// If `Date.now()` is invoked twice quickly, it's possible to get two
// identical time stamps. To avoid generation duplications, subsequent
// calls are manually ordered to force uniqueness.

var _last = 0
var _count = 1
var adjusted = 0
var _adjusted = 0

function timestamp () {
  /**
  Returns NOT an accurate representation of the current time.
  Since js only measures time as ms, if you call `Date.now()`
  twice quickly, it's possible to get two identical time stamps.
  This function guarantees unique but maybe inaccurate results
  on each call.
  **/
  // uncomment this wen
  var time = Date.now()
  // time = ~~ (time / 1000)
  // ^^^uncomment when testing...

  /**
  If time returned is same as in last call, adjust it by
  adding a number based on the counter.
  Counter is incremented so that next call get's adjusted properly.
  Because floats have restricted precision,
  may need to step past some values...
  **/
  if (_last === time) {
    do {
      adjusted = time + ((_count++) / (_count + 999))
    } while (adjusted === _adjusted)
    _adjusted = adjusted
  }
  // If last time was different reset timer back to `1`.
  else {
    _count = 1
    adjusted = time
  }
  _adjusted = adjusted
  _last = time
  return adjusted
}

export function newId () {
  // TODO lock all tabs
  var timeStr = timestamp().toString(36)
  while (timeStr.length < 9) {
    timeStr = '0' + timeStr
  }
  return timeStr
}
