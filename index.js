module.exports = NanoIterator

function NanoIterator (opts) {
  if (!(this instanceof NanoIterator)) return new NanoIterator(opts)

  this.opened = false
  this.closed = false
  this.ended = false

  this._nextQueue = []
  this._nextCallback = null
  this._nextDone = nextDone.bind(null, this)
  this._openDone = openDone.bind(null, this)

  if (opts) {
    if (opts.open) this._open = opts.open
    if (opts.next) this._next = opts.next
    if (opts.destroy) this._destroy = opts.destroy
  }
}

NanoIterator.prototype.next = function (cb) {
  if (this._nextCallback || this._nextQueue.length) {
    this._nextQueue.push(cb)
    return
  }

  this._nextCallback = cb
  if (!this.opened) this._open(this._openDone)
  else update(this)
}

NanoIterator.prototype.destroy = function (cb) {
  if (!cb) cb = noop

  if (this.closed) {
    this.next(() => cb())
    return
  }

  this.closed = true
  if (!this._nextCallback) this.opened = true
  this.next(() => this._destroy(cb))
}

NanoIterator.prototype._open = function (cb) {
  process.nextTick(cb, null)
}

NanoIterator.prototype._destroy = function (cb) {
  process.nextTick(cb, null)
}

NanoIterator.prototype._next = function (cb) {
  process.nextTick(cb, new Error('_next is not implemented'))
}

function noop () {}

function openDone (self, err) {
  if (err) return nextDone(self, err, null)
  self.opened = true
  update(self)
}

function nextDone (self, err, value) {
  var cb = self._nextCallback
  self._nextCallback = null
  if (!err && value === null) self.ended = true
  cb(err, value)

  if (!self._nextQueue.length) return

  self._nextCallback = self._nextQueue.shift()
  update(self)
}

function update (self) {
  if (self.ended) nextDoneNT(self, null, null)
  else if (self.closed) nextDoneNT(self, new Error('Iterator is destroyed'), null)
  else self._next(self._nextDone)
}

function nextDoneNT (self, err, val) {
  process.nextTick(nextDone, self, err, val)
}
