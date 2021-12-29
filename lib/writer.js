const log = console.log.bind (console)
function* symbols () { while (1) yield Symbol () }


// Generic Binary Writer
// =====================

// Write typed values to an expanding list of fixed-length buffers. 

// The 'type language' supports structs and tuples (quickly done, 
// so not nested) and are represented by objects; arrays; 
// and symbols for the primitive types. 

// NB this uses the **implicit order** of the objects' properties! so
// writeTyped ({ a:uint8, b:float32 }, some_obj) ≠ writeTyped ({ b:float32, a:uint8 }, some_obj)

const [ uint8, int32, float32, bytes ] = symbols ()
const types = { uint8, byte:uint8, int32, float32, bytes }
const sizes = {
  [uint8]: 1,
  [int32]: 4,
  [float32]: 4,
}

function writeTyped1 (t, v, view, pos) {
  switch (t) {
    case uint8:   view.setUint8   (pos, v, true);  break
    case int32:   view.setInt32   (pos, v, true);  break
    case float32: view.setFloat32 (pos, v, true);  break
    case bytes:   new Uint8Array (view.buffer) .set (v, pos) // REVIEW bounds check
  }
}

// _zip_ is used by the writer for creating a stream of pairs [type, value],
// with the types taken from an iterable `as` and the values taken from `bs`.

function* zip (as, bs) {
  as = as[Symbol.iterator]()
  bs = bs[Symbol.iterator]()
  for (;;) {
    const a = as.next (), b = bs.next ()
    if (a.done || b.done) return
    yield [a.value, b.value]
  }
}

// _zipo_ is used to create a stream of pairs [type, value] where `structType`
// is an object (a dict) of key-type pairs, and `obj` is a dict of key-value pairs. 

function* zipo (structType, obj) {
  for (const k in structType)
    yield [structType[k], obj[k] ?? 0]
}


// Writer API
// ----------

class Writer {

  constructor (pageSize = 1024) {
    this.pageSize = pageSize
    this.bufferList = []
    this.buffer = new ArrayBuffer (pageSize)
    this.view = new DataView (this.buffer)
    this.position = 0
  }

  getBookmark () {
    // TODO do this properly:
    // support rewriting across multiple pages
    const w = new Writer (this.pageSize)
    return Object.assign (w, this)
  }

  end () {
    if (this.position)
      this.bufferList.push (new Uint8Array (this.buffer) .subarray (0, this.position))
    this.buffer = this.view = null
    this.position = 0
    return this
  }

  write (type, value) {
    if (this.buffer == null)
      throw new Error ('write after end')

    const as = (Array.isArray (type) ? zip : zipo) (type, value)
    let a = as.next ()

    for (;;) {
      const [t, v] = a.value
      const size = t === bytes ? v.length : sizes [t]
      const available = this.buffer.byteLength - this.position

      if (size === available) {
        writeTyped1 (t, v, this.view, this.position)
        this.bufferList.push (new Uint8Array (this.buffer))
        this.buffer = new ArrayBuffer (this.pageSize)
        this.position = 0
        a = as.next ()
        if (a.done) return
      }

      else if (size < available) {
        writeTyped1 (t, v, this.view, this.position)
        this.position += size
        a = as.next ()
        if (a.done) return
      }

      else if (size > available) {
        const temp      = new ArrayBuffer (8)
        const tempBytes = new Uint8Array  (temp)
        writeTyped1 (t, v, new DataView (temp), 0) // REVIEW I think this can still break with 'bytes' args
        new Uint8Array (this.buffer) .set (tempBytes.subarray (0, available), this.position)
        this.bufferList.push (new Uint8Array (this.buffer))
        this.buffer = new ArrayBuffer (this.pageSize)
        this.view = new DataView (this.buffer)
        this.position = 0
        a = { value: [bytes, tempBytes.subarray (available, size)], done:false }
      }
    } 
    return this
  }

}


// Exports
// -------

export { Writer, types }