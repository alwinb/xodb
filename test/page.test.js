import { Page, Text, TextBox, Polyline, Styled, Rect, pens, parsePage, _private } from '../lib/page.js'
import { createWriteStream, promises as fs } from 'fs'
import { inspect } from 'util'
const log = console.log.bind (console)


// Example: Create Notebook Page
// =============================

// ## Example page

const examplePage = new Page ([

  new Styled ({
      lineHeight: 48,
      fontSize: 40,
      fontName: 'Roman',
      pen: pens.marker,
      // REVIEW, does the highlighter allow distinct widths?
    },
    new Text ({ x:100, y:100, w:1000 }, "Hello, World, " + new Date)
  ),

  new Styled ({ strokeWidth:4 },

    new Polyline (0, 0, 100, 100, 100, 200, 200, 200, 200, 300, 300, 400),

    new Styled ({
        color:1,
        strokeWidth:8
      },
      new Rect ({ x:400, y:400, w:800, h:1200 })
    )
  )
])


// Test
// ----

const __dirname =
  decodeURIComponent (new URL (import.meta.url) .pathname .replace (/[^/]*$/, ''))

async function main () {
  const r = new _private.PageWriter () .writePage (examplePage) .end ()
  const name = 'single_page'
  await fs.mkdir (__dirname + `../test.out`, { recursive:true })
  const ws = createWriteStream (__dirname + `../test.out/${name}.rm`)
  for (const x of r.bufferList) ws.write (x); ws.end ()
  ws.on ('finish', () => {
    log ('Created example page -- Reading back ...')
    readback (name)
  })
}

async function readback (name) {
  const buffer = await fs.readFile (__dirname + `../test.out/${name}.rm`)
  log (inspect (parsePage (buffer), { depth:5 }))
}

// Run

main ()
