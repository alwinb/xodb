const log = console.log.bind (console)

// reMarkable file format parser
// =============================
// TODO support input spanning multiple buffers

class Parser {

  constructor (delegate) {
    this.delegate = delegate
  }

  parse (buffer) {
    parse (buffer, this.delegate)
    return this
  }
}


// Parser implementation
// ---------------------

const int = Symbol ('int32le')
const float = Symbol ('float32le')

const magic = 'reMarkable .lines file, version='
const spaces = 10


function parse (buffer, delegate) {
  let pos = 0

  // Browser/ Compat
  if (globalThis.ArrayBuffer && buffer instanceof ArrayBuffer) {
    buffer = new DataView (buffer)
    buffer.readInt32LE = i => buffer.getInt32 (i, true)
    buffer.readFloatLE = i => buffer.getFloat32 (i, true)
    buffer.readUInt8 = buffer.getUint8
    buffer.length = buffer.byteLength
  }
  
  // Magic bytes
  for (let l = magic.length; pos<l; pos++)
    if (buffer.readUInt8 (pos) !== magic.charCodeAt (pos))
      throw new Error ('Not a .rm file header')

  // Version
  const version = buffer.readUInt8 (pos++) - 0x30
  if (version !== 3 && version !== 5 )
    throw new Error (`Unsupported .rm file version: ${version}`)

  // Padding
  for (; pos < magic.length + 11; pos++)
    if (buffer.readUInt8 (pos) !== 0x20) throw new Error ('Invalid .rm file')

  // Layers
  const numLayers = read (int)
  for (let i=0; i<numLayers; i++) {
    delegate.layer ()

    // Lines
    const numLines = read (int)
    for (let j=0; j<numLines; j++) {
      const lineHeader = version === 3
        ? read (int, int, int, float)
        : read (int, int, int, float, float)
        delegate.line (...lineHeader)

      // Points
      const numPoints = read (int)
      for (let k=0; k<numPoints; k++) {
        const point = read (float, float, float, float, float, float)
        delegate.point (...point)
      }
    }
  }
  
  if (pos !== buffer.length)
    throw new Error ('Superfluous content')

  // Where
  function read (...types) {
    const values = []
    for (let t of types) switch (t) {
      case int: 
        values.push (buffer.readInt32LE (pos))
        pos += 4
      break
      case float:
        values.push (buffer.readFloatLE (pos))
        pos += 4
      break
    }
    return types.length === 1 ? values[0] : values
  }

}


// Exports
// -------

export { Parser }