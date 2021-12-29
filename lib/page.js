import { Parser } from '../lib/parser.js'
import { Writer, types } from './writer.js'
import * as fonts from './hershey.js'

const log = console.log.bind (console)
const { assign } = Object
const { int32, float32, bytes } = types


// NotebookPage Object-model
// ==========================

function Page (...layers) {
  this.layers = layers
}

function Styled (st, ...children) {
  this.style = st
  this.children = children
}

function Rect ({ x, y, w, h }) {
  assign (this, { x, y, w, h })
}

function Text ({ x, y }, ...data) {
  assign (this, { x, y })
  this.data = data
}

function TextBox ({ x, y, w, h }, ...data) {
  assign (this, { x, y, w, h })
  this.data = data
}

function Polyline (...data) {
  this.data = data // flat list of x, y, x, y, ...
}

function RawLine (pen, color, u1, w, u2, points = []) {
  this.pen = pen
  this.color = color
  this.unknown1 = u1
  this.strokeWidth = w
  this.unknown2 = u2
  this.points = points
  // points are arrays [x, y, speed, direction, width, pressure]
}

// constants

const colors = {
  black:0,
  grey:1,
  white:2,
}

const pens = {
  eraser: 6,
  eraser_area: 8,
  paintbrush: 12,
  mechanical_pencil: 13,
  pencil: 14,
  ballpoint: 15,
  marker: 16,
  fineliner: 17,
  highlighter: 18,
  calligraphy: 21,
}


// PageBuilder - Parser delegate
// -----------------------------
    
function PageBuilder () {

  const page = new Page ()
  const layers = page.layers
  let _layer, _line, _points

  return new class PageBuilder {

    get result () {
      return page
    }

    layer () {
      layers.push (_layer = [])
      _line = _points = null
      return this
    }

    line (...args) {
      _layer.push (_line = new RawLine (...args))
      _points = _line.points
      return this
    }

    point (...args) {
      _points.push (args)
      return this
    }

  }
}

function parsePage (buffer) {
  const parser = new Parser (new PageBuilder ())
  return parser.parse (buffer) .delegate .result
}


// Typesetter
// ----------

function* setType (box, ...data) {
  // So the idea is that this is a lot like a parser state,
  // so, it'll store the remaining data to be typeset.
  // and meanwhile? it can emit words? Lines?
  // How do this in a _neat_ way?
}


// Page Writer
// -----------

// .rm types

const pointTuple =
  [ float32, float32, float32, float32, float32, float32 ]
  // [x, y, speed, direction, width, pressure]

const lineStyleStruct = {
  pen: int32,
  color: int32,
  unknown1: int32,
  strokeWidth: int32,
  unknown2: int32
}


// .rm header

const header = [...'reMarkable .lines file, version=5          ']
  .map (_ => _.codePointAt (0))


// Page writer - to bufferList

class PageWriter {
  
  constructor () {
    this.writer = new Writer ()
    this.style = { pen:pens.fineliner, color:colors.black, strokeWidth:1 }
    this._linecount = 0
    this._linecountIndex = null
  }

  end () {
    this.writer.end ()
    return this
  }

  get bufferList () {
    return this.writer.bufferList
  }

  writePage (pageObject) {
    const w = this.writer
    w.write ([bytes, int32], [header, pageObject.layers.length])
    for (const layer of pageObject.layers) {
      this.rewriteLinecount (this._linecount)
      this._linecountIndex = w.getBookmark ()
      w.write ([int32], [this._linecount = 0]) // initial line count of next layer
      for (const obj of layer) this.writeObject (obj)
    }
    this.rewriteLinecount (this._linecount)
    return this
  }

  rewriteLinecount (n) {
    if (this._linecountIndex)
      this._linecountIndex.write ([int32], [n])
    this._linecount = 0
  }

  writePointData (data) {
    const w = this.style.strokeWidth
    for (let i=0, l=data.length; i<l; i+=2)
      this.writer.write (pointTuple, [data[i], data[i+1], .5, 3, w, .5])
      // [x, y, speed, direction, width, pressure]
  }

  // Using glyphs from the Hershey fonts:
  // { left, right, lines } for now, with lines an array of tuples [x,y]
  // and the 'visual center' of the glyph at [0,0]
  
  writeGlyph (px, py, glyph, s = 2) {
    /*// bearings 
    [px + s * glyph.left,  py - 22]
    [px + s * glyph.left,  py + 12]
    [px + s * glyph.right, py - 22]
    [px + s * glyph.right, py + 12] //*/
    // draw glyph
    for (const line of glyph.lines) {
      this._linecount++
      this.writer.write (lineStyleStruct, this.style)
      this.writer.write ([int32], [line.length])
      for (const [x,y] of line)
        this.writer.write (pointTuple, [px + s*x, py + s*y, .5, 3, s*2.7, .5])
    }
  }

  writeObject (obj) {

    if (obj instanceof Styled) {
      const style_ = assign ({}, obj.style)
      this.style = Object.setPrototypeOf (style_, this.style)
      for (const c of obj.children) this.writeObject (c)
    }

    else if (obj instanceof Polyline) {
      this._linecount++
      this.writer.write (lineStyleStruct, this.style)
      this.writer.write ([int32], [obj.data.length / 2])
      this.writePointData (obj.data)
    }

    else if (obj instanceof Rect) {
      this._linecount++
      this.writer.write (lineStyleStruct, this.style)
      const { x, y, w, h } = obj
      this.writer.write ([int32], [5]) // five points; close on first
      this.writePointData ([x, y, x + w, y, x + w, y + h, x, y + h, x, y])
    }

    // TODO include the TextBox typesetter again, too
    else if (obj instanceof TextBox || obj instanceof Text) {
      let { x:px, y:py } = obj
      const { fontName = 'Roman', fontSize = 20, lineHeight = 24 } = this.style
      const font = fonts [this.style.fontName] || fonts.Roman
      // log ('selected font', this.style.fontName, font)
      // if (font == null) throw new Error (`No such font: ${this.style.fontName}; And no fallback available`)
      const scale = fontSize / font.em
      for (const string of obj.data) for (let code of string) {
        const glyph = font.toGlyph (code)
        px -= scale * glyph.left
        this.writeGlyph (px, py, glyph, scale)
        px += scale * glyph.right
      }
    }
    
    else if (obj instanceof TextBox) {
      // Cool, now include the typesetter for textBox, too
    }

  }
}


// Exports
// -------

const _private =
  { Parser, PageBuilder, Writer, types, PageWriter }

export { 
  parsePage,
  Page, Styled, Rect, Polyline, RawLine, Text, TextBox,
  pens, colors,
  _private,
}