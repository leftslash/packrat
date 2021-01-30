const fs = require('fs')

// TODO: re-write load/save to do JSON
// TODO: add lots more tests
// TODO: document errors
// TODO: document keys, values...
// TODO: create a makefile
// TODO: add to npm and yarn

function Packrat() {
  this._internals = {}
  this._internals.file = null
  this._internals.data = {}
  this._internals.nextid = 1
  this.throws = this.e = new ThrowingPackrat(this)
  this.doesNotThrow = this.n = this
}

function ThrowingPackrat(parent) {
  this._internals = parent._internals
  this._parent = parent
  this.throws = this.e = this
  this.doesNotThrow = this.n = parent
}

ThrowingPackrat.prototype = Object.create(Packrat.prototype)
ThrowingPackrat.prototype.constructor = ThrowingPackrat

Packrat.prototype.load = function(file) {
  if (!file) {
    return Promise.reject()
  }
  return new Promise((resolve, reject) => {
    fs.readFile(this._internals.file, 'utf8', (err, data) => {
      if (err) {
        reject(err)
      } else {
        this._internals.file = file
        this._internals.data = data
        resolve(this)
      }
    })
  })
}

Packrat.prototype.save = function() {
  if (!this._internals.file) {
    return Promise.reject()
  }
  return new Promise((resolve, reject) => {
    fs.writeFile(this._internals.file, this._internals.data, 'utf8', (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
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
  this._internals.data[item.id] = id
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

Packrat.prototype.InvalidIdError.prototype = Object.create(Error.prototype)
Packrat.prototype.InvalidItemError.prototype = Object.create(Error.prototype)
Packrat.prototype.ItemNotFoundError.prototype = Object.create(Error.prototype)

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
  return new Promise((resolve, reject) => {
    fs.appendFile(this._internals.file, `${JSON.stringify(item)}\n`, (err) => {
      if (err) {
        console.error(err)
        resolve()
      } else {
        resolve()
      }
    })
  })
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
