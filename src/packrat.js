const fs = require('fs')
const readline = require('readline')

// TODO: add lots more tests
// TODO: add to npm and yarn

function Packrat() {
  this._internals = {
    data:   {},
    file:   null,
    nextid: 1,
    pending_writes: [],
  }
  this.throws = this.e = new ThrowingPackrat(this)
  this.doesNotThrow = this.n = this
}

function ThrowingPackrat(parent) {
  this._parent = parent
  this._internals = parent._internals
  this.throws = this.e = this
  this.doesNotThrow = this.n = parent
}

ThrowingPackrat.prototype = Object.create(Packrat.prototype)
ThrowingPackrat.prototype.constructor = ThrowingPackrat

Packrat.prototype.load = function(file) { 
  if (!file) {
    return Promise.reject(new this.FileError('filename must be non-null'))
  }
  return new Promise((resolve, reject) => {
    const input = fs.createReadStream(file)
    const reader = readline.createInterface({ input })
    reader.on('line', line => {
      let item
      try {
        item = JSON.parse(line)
      } catch (e) {
        console.error(`error parsing JSON data: ${line}`)
        process.exit(1)
      }
      if (!item) {
        return
      }
      if (item._deleted === true) {
        this.drop(item.id)
      } else {
        if (Number.isInteger(item.id)) {
          this._internals.nextid = item.id + 1
        }
        this.set(item)
      }
    })
    reader.on('close', () => {
      this._internals.file = file
      resolve(this)
    })
    input.on('error', (err) => {
      if (err.code === 'ENOENT') {
        this._internals.file = file
        resolve(this)
      } else {
        console.error(`error reading file: ${file}: ${err}`)
        process.exit(1)
      }
    })
  })
}

Packrat.prototype.save = async function() {
  if (!this._internals.file) {
    return Promise.reject(new this.FileError('no file, use saveAs'))
  }
  await Promise.all(this._internals.pending_writes)
  this._internals.pending_writes = []
  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(this._internals.file)
    const items = Object.values(this._internals.data)
    let i = 0, n = items.length
    const write = () => {
      let ok = true
      do {
        if (items[i]) {
          const item = `${JSON.stringify(items[i])}\n`
          ok = writer.write(item, (err) => {
            if (err) {
              console.error(`error writing file: ${this._internals.file}`)
              process.exit(1)
            }
          })
        }
        i++
      } while (ok && i < n)
      if (!ok) {
        writer.once('drain', write)
      } else {
        writer.end('', () => {
          resolve()
        })
      }
    }
    write()
  })
}

Packrat.prototype.saveAs = function(file) {
  this._internals.file = file
  return this.save()
}

Packrat.prototype.clear = function() {
  this._internals.data = []
  this._internals.nextid = [1]
}

Packrat.prototype.get = function(id) {
  return this._internals.data[id]
}

ThrowingPackrat.prototype.get = function(id) {
  const result = this.get(id)
  if (!result) {
    throw new this.ItemNotFoundError()
  }
  return result
}

Packrat.prototype.set = function(item) {
  if (isInvalidItem(item)) {
    return null
  }
  return this._set(item)
}

ThrowingPackrat.prototype.set = function(item) {
  if (isInvalidItem(item)) {
    throw new this.InvalidItemError()
  }
  const result = this._set(item)
  if (!result) {
    throw new this.InvalidIdError()
  }
  return result
}

Packrat.prototype._set = function(item) {
  if (isInvalidId(item.id)) {
    return null
  }
  this._addIdIfNecessary(item)
  this._writeTransactionLog(item)
  this._internals.data[item.id] = item
  return item
}

Packrat.prototype.add = function(item) {
  if (isInvalidItem(item)) {
    return null
  }
  return this._add(item)
}

ThrowingPackrat.prototype.add = function(item) {
  if (isInvalidItem(item)) {
    throw new this.InvalidItemError()
  }
  const result = this._add(item)
  if (!result) {
    throw new this.InvalidIdError()
  }
  return result
}

Packrat.prototype._add = function(item) {
  if (isInvalidId(item.id)) {
    return null
  }
  this._addIdIfNecessary(item)
  if (this._internals.data[item.id]) {
    return null
  }
  this._writeTransactionLog(item)
  this._internals.data[item.id] = item
  return item
}

Packrat.prototype.update = function(item) {
  if (isInvalidItem(item)) {
    return null
  }
  return this._update(item)
}

ThrowingPackrat.prototype.update = function(item) {
  if (isInvalidItem(item)) {
    throw new this.InvalidItemError()
  }
  const result = this._update(item)
  if (!result) {
    throw new this.InvalidIdError()
  }
  return result
}

Packrat.prototype._update = function(item) {
  if (isInvalidId(item.id)) {
    return null
  }
  if (item.id === undefined) {
    return null
  }
  if (!this._internals.data[item.id]) {
    return null
  }
  this._writeTransactionLog(item)
  this._internals.data[item.id] = item
  return item
}

Packrat.prototype.drop = function(id) {
  this._writeTransactionLog({id, _deleted: true})
  return delete this._internals.data[id]
}

ThrowingPackrat.prototype.drop = function(id) {
  if (!this._internals.data[id]) {
    throw new this.ItemNotFoundError()
  }
  return this.drop(id)
}

Packrat.prototype.find = function(callback) {
  return Object.values(this._internals.data).find(callback)
}

Packrat.prototype.asArray = function(f, ...args) {
  return f.call(Object.values(this._internals.data), ...args)
}

Packrat.prototype.keys = function() {
  return Object.keys(this._internals.data)
}

Packrat.prototype.values = function() {
  return Object.values(this._internals.data)
}

Packrat.prototype.entries = function() {
  return Object.entries(this._internals.data)
}

Packrat.prototype.length = function() {
  return Object.keys(this._internals.data).length
}

Packrat.prototype.InvalidIdError = function() {
  this.message = 'id is not valid, must be string or integer'
  Error.captureStackTrace(this, Packrat.prototype.InvalidIdError)
}

Packrat.prototype.InvalidItemError = function() {
  this.message = 'item is not valid, must be object or array'
  Error.captureStackTrace(this, Packrat.prototype.InvalidItemError)
}

Packrat.prototype.ItemNotFoundError = function() {
  this.message = 'item with this id cannot be found'
  Error.captureStackTrace(this, Packrat.prototype.InvalidItemError)
}

Packrat.prototype.FileError = function(message) {
  this.message = message
  Error.captureStackTrace(this, Packrat.prototype.InvalidItemError)
}

Packrat.prototype.InvalidIdError.prototype = Object.create(Error.prototype)
Packrat.prototype.InvalidIdError.prototype.constructor = Packrat.prototype.InvalidIdError

Packrat.prototype.InvalidItemError.prototype = Object.create(Error.prototype)
Packrat.prototype.InvalidItemError.prototype.constructor = Packrat.prototype.InvalidItemError

Packrat.prototype.ItemNotFoundError.prototype = Object.create(Error.prototype)
Packrat.prototype.ItemNotFoundError.prototype.constructor = Packrat.prototype.ItemNotFoundError

Packrat.prototype.FileError.prototype = Object.create(Error.prototype)
Packrat.prototype.FileError.prototype.constructor = Packrat.prototype.FileError

Packrat.prototype._addIdIfNecessary = function(item) {
  if (item.id === undefined) {
    item.id = this._internals.nextid++
  }
  // convert negative zero to normal zero (for JSON sake)
  if (item.id === -0) {
    item.id = 0
  }
}

Packrat.prototype._writeTransactionLog = function(item) {
  if (!this._internals.file) {
    return Promise.resolve()
  }
  const promise = new Promise((resolve, reject) => {
    fs.appendFile(this._internals.file, `${JSON.stringify(item)}\n`, (err) => {
      if (err) {
        console.error(err)
        resolve()
      } else {
        resolve()
      }
    })
  })
  this._internals.pending_writes.push(promise)
  return promise
}

function isInvalidItem(item) {
  if (!item || typeof item !== 'object') {
    return true
  }
  return false
}

function isInvalidId(id) {
  // undefined is ok
  if (id !== undefined) {
    // if id is not a string 
    if (typeof id !== 'string') {
      // and if id is also not a number
      //   which includes null since null is an object
      if (typeof id !== 'number') {
        return true
      } else {
        // if id is a number, perform add'l validation
        // i.e., id must be a finite integer
        if (!Number.isInteger(id)) {
          return true
        }
      }
    } 
  }
  return false
}

function Factory(file) {
  if (file) {
    const packrat = new Packrat()
    return packrat.load(file)
  }
  return new Packrat()
}

module.exports = Factory
