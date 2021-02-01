const packrat = require('./packrat')

let db
let Packrat 

beforeAll(() => {
  db = packrat()
  Packrat = Object.getPrototypeOf(db).constructor
})

describe('factory', () => {

  test('ok: normal', () => {
    const db = packrat()
    expect(db).toBeInstanceOf(Packrat)
  })

  test('ok: constructor', () => {
    const db = new packrat()
    expect(db).toBeInstanceOf(Packrat)
  })

})

describe('set', () => {

  describe('item', () => {

    test('ok: object', () => { 
      const item = {}
      const result = db.set(item)
      expect(result).toBe(item)
      expect(item.id).toBe(1)
    })

    test('ok: array', () => { 
      const item = []
      const result = db.set(item)
      expect(result).toBe(item)
      expect(item.id).toBe(2)
    })

    test('no: string primitive', () => { 
      const item = 'string'
      const result = db.set(item)
      expect(result).toBeNull()
      expect(item.id).toBeUndefined()
    })

    test('no: string object', () => { 
      const item = String('string')
      const result = db.set(item)
      expect(result).toBeNull()
      expect(item.id).toBeUndefined()
    })

    test('no: number primitive', () => { 
      const item = 1
      const result = db.set(item)
      expect(result).toBeNull()
      expect(item.id).toBeUndefined()
    })

    test('no: number object', () => { 
      const item = Number(1)
      const result = db.set(item)
      expect(result).toBeNull()
      expect(item.id).toBeUndefined()
    })

    test('no: boolean primitive', () => { 
      const item = false
      const result = db.set(item)
      expect(result).toBeNull()
      expect(item.id).toBeUndefined()
    })

    test('no: boolean object', () => { 
      const item = Boolean(false)
      const result = db.set(item)
      expect(result).toBeNull()
      expect(item.id).toBeUndefined()
    })

    test('no: null', () => { 
      const item = null
      const result = db.set(item)
      expect(result).toBeNull()
      expect(item).toBeNull()
    })

    test('no: undefined', () => { 
      const item = undefined
      const result = db.set(item)
      expect(result).toBeNull()
      expect(item).toBeUndefined()
    })

  })

  describe('id', () => {

    test('ok: empty', () => { 
      const item = { }
      const result = db.set(item)
      expect(result).toBe(item)
      expect(item.id).toBe(3)
    })

    test('ok: undefined', () => { 
      const item = { db: undefined }
      const result = db.set(item)
      expect(result).toBe(item)
      expect(item.id).toBe(4)
    })

    test('ok: string', () => { 
      const item = { id: '101' }
      const result = db.set(item)
      expect(result).toBe(item)
      expect(item.id).toBe('101')
    })

    test('ok: integer 0', () => { 
      const item = { id: 0 }
      const result = db.set(item)
      expect(result).toBe(item)
      expect(item.id).toBe(0)
    })

    test('ok: integer 1', () => { 
      const item = { id: 1 }
      const result = db.set(item)
      expect(result).toBe(item)
      expect(item.id).toBe(1)
    })

    test('ok: integer -0', () => { 
      const item = { id: 0/-1 }
      const result = db.set(item)
      expect(result).toBe(item)
      expect(item.id).toBe(0)
    })

    test('ok: integerish float 1.0', () => { 
      const item = { id: 1.0 }
      const result = db.set(item)
      expect(result).toBe(item)
      expect(item.id).toBe(1)
    })

    test('no: array [1]', () => { 
      const item = { id: [1] }
      const result = db.set(item)
      expect(result).toBeNull()
      expect(item.id).toBe(item.id)
    })

    test('no: infinity', () => { 
      const item = { id: 1/0 }
      const result = db.set(item)
      expect(result).toBeNull()
      expect(item.id).toBe(Infinity)
    })

    test('no: infinity negative', () => { 
      const item = { id: -1/0 }
      const result = db.set(item)
      expect(result).toBeNull()
      expect(item.id).toBe(-Infinity)
    })

    test('no: null', () => { 
      const item = { id: null }
      const result = db.set(item)
      expect(result).toBeNull()
      expect(item.id).toBeNull()
    })

    test('no: NaN', () => { 
      const item = { id: parseInt('') }
      const result = db.set(item)
      expect(result).toBeNull()
      expect(item.id).toEqual(NaN)
    })

    test('no: float 1.1', () => { 
      const item = { id: 1.1 }
      const result = db.set(item)
      expect(result).toBeNull()
      expect(item.id).toBe(1.1)
    })

  })

})

describe('throws.set', () => {

  describe('item', () => {

    test('ok: object', () => { 
      const item = {}
      const result = db.throws.set(item)
      expect(result).toBe(item)
      expect(item.id).toBe(5)
    })

    test('no: string', () => { 
      const item = 'string'
      let result
      expect(() => result = db.throws.set(item)).toThrowError(/must be object or array/)
      expect(result).toBeUndefined()
      expect(item).toBe(item)
    })

    test('no: null', () => { 
      const item = null
      let result
      expect(() => result = db.throws.set(item)).toThrowError(/must be object or array/)
      expect(result).toBeUndefined()
      expect(item).toBeNull()
    })

  })

  describe('id', () => {

    test('ok: string', () => { 
      const item = { id: 'string' }
      const result = db.throws.set(item)
      expect(result).toBe(item)
      expect(item.id).toBe('string')
    })

    test('no: null', () => { 
      const item = { id: null }
      let result
      expect(() => result = db.throws.set(item)).toThrowError(/must be string or integer/)
      expect(result).toBeUndefined()
      expect(item).toBe(item)
    })

  })

})
