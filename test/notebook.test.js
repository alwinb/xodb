import { openXochitlDB } from '../lib/xochitldb.js'
import { Page, Text, Styled } from '../lib/page.js'
import * as fonts from '../lib/hershey.js'
import fs from 'fs/promises'
const log = console.log.bind (console)


// Example: Create Notebook in Database
// =====================================

// The function createExamplePage creates a Page object with a single layer
// that consists of an iterator of Styled objects with a Text childnode, 
// as a sample for each of the fonts.

function createExamplePage () {
  return new Page (createFontSamples ({ x:200, y:260, w:800 }))
}

function* createFontSamples ({ x, y, w }) {
  for (const k in fonts) {
    const font = fonts [k]
    const text = k + ": Hello, World!\nfoo" // REVIEW support for newlines in Text vs. TextBox?
    yield new Styled ({ fontSize:40, fontName:font.name }, new Text ({ x, y, w }, text))
    y += 100
  }
}

// The main function opens the directory ./out/db as a xochitl database.
// The db is intended for writing only, so there is no need to build an index
// from the database folder, as indicated with the option { readIndex:false }.
// It then creates a new notebook with the name 'Hello, World' in the root
// (My Files) folder in the database with the example page as its first page.

const __dirname =
  decodeURIComponent (new URL (import.meta.url) .pathname .replace (/[^/]*$/, ''))

async function main () {
  await fs.mkdir ('../test.out/xodb/', { recursive:true })
  const db = await openXochitlDB (__dirname + '../test.out/xodb/', { readIndex:false })
  const page = createExamplePage ()
  const callback = () => log ('created notebook in', db)
  db.createNotebook ('Hello, World', page, callback)
  // fs.rmdir ('out/xodb/', { recursive:true })
}

main ()
