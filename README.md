# Packrat
a zero-dependency, lightweight, file-based JSON storage database

Packrat allows simple operations on an in-memory dataset which are
also stored asynchronously in a flat file in JSON format (i.e. it is a
non-volatile, persistent data store).  Instead of re-writing the entire
database or doing costly seeks and writes for each change, packrat simply
appends new records, updates and deletes to the end of the file in JSON format, sort of
like a database transaction log.  When the file is re-read (e.g. your app is
restarted), packrat read the records of the database and any transactions
recorded at the end so that the database is reconstituted accurately in memory.
Upon request, the database can be written out in it's entirety to the
same or another file in a compacted format which contains just the data
and not all the changes recorded to that point in the transaction log.

The main operations available for manipulating data in packrat are:

  get(id)         retrieve an item by it's id 
  set(item)       add or update an item (id is added to item if necessary)
  add(item)       add an item if it does not exist (assumes item has an id)
  update(item)    update an item if it does exist (assumes item has an id)
  find(search)    find an item using a search callback function 
  drop(id)        delete an item based on it's id

In addition, the database itself can be managed using the following methods:

  packrat(file)   constructor to create a database with file as backing
  load(file)      load and append data from file 
  save()          save data in its entirety to current file
  saveAs(file)    save data to an arbitrary file
  clear()         empty the in-memory database

Note that save/saveAs operations are not necessary to maintain the 
persistence of the in-memory version of the database.  As stated earlier,
any changes to the data (when the set/add/update/drop functions are used)
are automatically and asynchronously written to the backing file.
The save/saveAs methods are only necessary to write a compacted version
of the database without the transaction log that's been recorded to date.

Caveat emptor: If you make changes to items that are stored in the in-memory
database, you must do a set/add/update/drop or those changes will not
be persisted to disk (we're not magicians).

Also note that while the backing file contains JSON data for each item in the database,
the file itself is not valid JSON and cannot be slurped up using a require
statement or a readFile/JSON.parse combination. 

To make things a little clearer, here's an example of how to use packrat:

  const packrat = require('packrat')

  main() 

  async function main() {

    const db = await packrat('json.db')

    let item = { a: 1 }
    db.add(item)
    let id = item.id

    item = db.get(id)
    item.a = 2
    db.update(item)

    item = await db.find(e => e.a === 2)

    db.remove(id)

  }


### Constraints on Items
Items must be objects or arrays.  Primitive types (including strings)
and functions are not supported since they cannot be assigned an "id"
property which they hold and maintain over time and which is necessary
for efficient storage and retrieval via JSON.  Functions can hold such
a property but they themselves cannot surivive JSON-ification.  That is, they cannot
be rendered and retrieved in a meaningful way.  If you really want to
store a primitive type, you can wrap it in an object or make it the
sole element of an array (which doesn't require a name like an object).
Bear in mind that while strings, numbers and booleans generally survive
JSON render and re-animation cycles, some values of these types do not
(e.g. Infinity, -Infinity, NaN and -0 to name a few). If unsure, test 
using JSON.stringify/JSON.parse.

### Constraints on Ids
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
