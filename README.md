# packrat
a zero-dependency, lightweight, file-based JSON database

Packrat allows simple operations on an in-memory dataset which are
also stored asynchronously in a flat file in JSON format (i.e. it is
a non-volatile, persistent data store).  Instead of re-writing the
entire database or doing costly seeks and writes for each change,
packrat simply appends new records, updates and deletes to the end
of the file in JSON format, sort of like a database transaction log.
When the file is re-read (e.g. your app is restarted), packrat read
the records of the database and any transactions recorded at the end so
that the database is reconstituted accurately in memory.  Upon request,
the database can be written out in it's entirety to the same or another
file in a compacted format which contains just the data and not all the
changes recorded to that point in the transaction log.

### Manipulating Data
The main operations available for manipulating data in packrat are:

```javascript
  get(id)         // retrieve an item by it's id 
  set(item)       // add or update an item (id is added to item if necessary)
  add(item)       // add an item if it does not exist (assumes item has an id)
  update(item)    // update an item if it does exist (assumes item has an id)
  find(search)    // find an item using a search callback function 
  drop(id)        // delete an item based on it's id
```

### Managing Database
In addition, the database itself can be managed using the following methods:

```javascript
  packrat(file)   // constructor to create a database with file as backing
  load(file)      // load and append data from file 
  save()          // save data in its entirety to current file
  saveAs(file)    // save data to an arbitrary file
  clear()         // empty the in-memory database
 ```

Note that save/saveAs operations are not necessary to maintain the
persistence of the in-memory version of the database.  As stated earlier,
any changes to the data (when the set/add/update/drop functions are
used) are automatically and asynchronously written to the backing file.
The save/saveAs methods are only necessary to write a compacted version
of the database without the transaction log that's been recorded to date.

Caveat emptor: If you make changes to items that are stored in the
in-memory database, you must do a set/add/update/drop or those changes
will not be persisted to disk (we're not magicians).

Also note that while the backing file contains JSON data for each item
in the database, the file itself is not valid JSON and cannot be slurped
up using a require statement or a readFile/JSON.parse combination.

### Simple Example
To make things a little clearer, here's an example of how to use packrat:

```javascript
  const packrat = require('packrat')

  main() 

  async function main() {

    let db = await packrat('json.db')

    let item = { a: 1 }
    db.add(item)
    let id = item.id

    item = db.get(id)
    item.a = 2
    db.update(item)

    item = db.find(e => e.a === 2)

    db.drop(id)

  }
```

### Constraints on Items
Items must be objects or arrays.  

Primitive types (including strings) and functions are not supported since
they cannot be assigned an "id" property which they hold and maintain
over time and which is necessary for efficient storage and retrieval
via JSON.  Functions can hold such a property but they themselves cannot
surivive JSON-ification.  That is, they cannot be rendered and retrieved
in a meaningful way.  If you really want to store a primitive type, you
can wrap it in an object or make it the sole element of an array (which
doesn't require a name like an object).  Bear in mind that while strings,
numbers and booleans generally survive JSON render and re-animation
cycles, some values of these types do not (e.g. Infinity, -Infinity, NaN
and -0 to name a few). If unsure, test using JSON.stringify/JSON.parse.

### Constraints on Ids
Ids must be strings or integers.

If you assign your own id to items stored by packrat, you must use either
a string or an integer (which satisfies Number.isInteger).  -0 will be
converted to 0.  Floats are not supported since they may not survive
JSON-ification with the exact same value thanks to the vagaries of the
IEEE754 standard.  If you really want to use a float, convert it to a
string with fixed precision (toFixed).  If you want to use some other
type, you can convert it to a string via toString or JSON.stringify.

Apologies in advance for these constraints, but we're just trying to
make this thing work as simply and as fast for the vast majority of
use cases.  If you want or need to do esoteric stuff it's on you in terms
of complexity and performance.  You can always add your own extra code,
wrap this module or fork it and make the mods you need.

### Return Values and Errors
By default, the get/set/add/update/drop methods return null if there
is an error such as invalid item or item.id and return the item itself
on success.  While this is typically sufficient for most use cases, some
developers prefer code that throws errors with a more specific error
message and a stacktrace.  In order to support this type of approach,
packrat offers an alternative set of methods which have the same name
but exist on a sub-object.  So, instead of calling `db.add(...)` you
would instead call `db.throws.add(...)` as shown in the example below.

```javascript
  let db = await packrat('json.db')
  
  // Normal null-returning approach
  let item = { id: 1.3 } // fails since float id's are invalid
  let ok = db.add(item)
  if (!ok) {
    console.error(`could not add item`)
  }
  
  // Error try/catch approach
  try {
    let item = { id: 1.3 } // fails since float id's are invalid
    db.throws.add(item)
  } catch (e) {
    console.error(`could not add item: ${e.message}`)  
  }  
```

If you want to use the "throwing" version of the API but not type the
label `.throws` on every single call, you can use the shorthand `.e` which
stands for error or exception as in `db.e.add(...)`, or just replace your
version of the packrate instance variable with the "throwing" version as
shown below.  You can go back and forth between the two versions by using
`.throws` and `.doesNotThrow` as also depicted below.

```javascript
  let db = await packrat('file.db`)

  // set the 'throwing' version as the default
  let db = db.throws
  
  try {
    let item = { id: 1.3 }
    db.add(item)
  } catch (e) {
    console.error(`could not add item: ${e.message}`)  
  }  
  
  let item = { id: 1.3 }
  let ok = db.doesNotThrow.add(item)
  if (!ok) {
    console.error(`could not add item`)
  }
```

The errors that packrat throws are not general errors, but specific 
classes that can be acted upon.  Here's an example of all the 
errors that are defined for packrat and how they could be handled.

```javascript
  try {
    db.set(...)
    db.get(...)
  } catch (e) {
    if (e instanceof db.InvalidIdError) {
      ...
    } else if (e instanceof db.InvalidItemError) {
      ...
    } else if (e instanceof db.ItemNotFoundError) {
      ...
    } else {
      ...
    }
    
  }
```

### Additional Methods

```javascript
  keys()      // returns an array of all the ids
  values()    // returns an array of all the items
  entries()   // returns an array of id/items a la Object.entries()
  length()    // returns the number of items being stored
```

These methods return underlying packrat data as a naked, native array.
Any changes made to the data in these arrays will not be persisted unless
the underlying item is updated via `set()` or `update()`.  These methods
are merely for providing unvarished and performant access on a read-only
basis (i.e. for returning a list of items to a REST client).

### All Purpose Array-Method

In addition to the methods above which return data as an array, packrat
provides an additional method `asArray(f, ...args)` which takes an
Array function as it's first parameter and calls this function on the
packrat data with the arguments passed to `asArray` after the function.
Here's a few examples:

```javascript
  // get an array of uppercase values for the somestring property
  db.clear() // get rid of any detritus
  db.set({somestring: 'hello'})
  db.set({somestring: 'world'})
  const shouty = db.asArray(Array.prototype.map, e => e.somestring.toUpperCase())

  // get sum of somenumber using reduce (note the Array.prototype shorthand)
  db.clear() // get rid of any detritus
  db.set({somenumber: 1})
  db.set({somenumber: 2})
  db.set({somenumber: 3})
  const sum = db.asArray([].reduce, (n,i) => n + i.somenumber, 0)
```

### Why

Yeah, yeah, we know there are lots of other packages to do this sort
of thing (i.e.  Mongo, Redis, Sqlite, LevelDB, RocksDB, PouchDB, NeDB,
LowDB, AirDB, Enmap) but we wanted to do it our way.
