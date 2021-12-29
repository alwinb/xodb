import { parsePage } from '../lib/page.js'
import * as fs from 'fs/promises'
import { inspect }  from 'util'
const log = console.log.bind (console)


// Parser Test
// ===========

const __dirname =
  decodeURIComponent (new URL (import.meta.url) .pathname .replace (/[^/]*$/, ''))

const fname =
  __dirname + 'data/line-width.rm'

async function main () {
  log ('Parsing', fname, '...')
  const buffer = await fs.readFile (fname)
  const page = parsePage (buffer)
  log (inspect (page, { depth:5 }))
}

main ()
