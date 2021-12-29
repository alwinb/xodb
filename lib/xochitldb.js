import { XochitlEntities } from '../lib/entities.js'
import { Page, _private } from '../lib/page.js'
import { createWriteStream } from 'fs'
import * as fs from 'fs/promises'
const  { PageWriter } = _private

const log = console.log.bind (console)
const { setPrototypeOf:setProto, defineProperty:define } = Object


// XochitlDB
// ==========

// A xochitl notebook database, with a 'selected object'.
// This is similar to a current working directory, except
// the 'cwd' -nee, selection here, may be a notebook as well.

async function openXochitlDB (location, options = { readIndex:true }) {

  const {
    uuidgen,
    UnknownEntity,
    Folder,
    VFolder,
    RootFolder,
    TrashFolder,
    PDFDocument,
    EPubDocument,
    Notebook,
    NotebookPage } = await XochitlEntities ()

  const db = new class XochitlDB {

  constructor () {
    this.location = location
    this.loaded = false
    
    // DB index
    const index     = Object.create (null)
    const myFiles   = new RootFolder ('My Files')
    const trash     = new TrashFolder ('Trash')
    const favorites = new VFolder ('Favorites')
    const deleted   = new VFolder ('Deleted')
    
    index [''] = myFiles
    index ['trash'] = trash
    const hidden = { index, myFiles, trash, favorites, deleted }
    for (const k in hidden) define (this, k, { value:hidden[k] })

    this.selection = myFiles
  }

  // ### Loading

  async readIndex () {
    return this._readIndex ()
  }

  // Q. Does it make sense to use fs.watch to keep the index up-to-date?
  // And then to also emit useful change events?

  // ### Navigation

  selectMyFiles () {
    this.selection = this.myFiles
    return this
  }

  selectTrash () {
    this.selection = this.trash
    return this
  }

  selectFavorites () {
    this.selection = this.favorites
    return this
  }

  selectDeleted () {
    this.selection = this.deleted
    return this
  }

  selectParent () {
    const c = obj?.constructor
    if (c === VFolder) return this // REVIEW would be good to do more proper state distinctions
    else return this.selectById (this.selection.metadata.parent)
  }

  // ### Navigation (2)

  selectObject (obj) {
    const c = obj?.constructor
    if (c !== Notebook && c !== Folder && c !== PDFDocument && c !== EPubDocument)
      throw new Error (`Xochitldir.select: not a selectable object: ${JSON.stringify (obj, null, 2)}`)
    this.selection = obj
    return this
  }

  selectByName (...names) {
    this._assertLoaded ()
    let current = this._assertIn (Folder)
    search: for (const name of names) {
      for (const child of current.children) {
        if (child.metadata.visibleName === name) {
          current = child
          continue search
        }
      }
      throw new Error (`XochitlDB.selectByName: no such object`)
    }
    this.selection = current
    return this
  }

  selectById (uuid) {
    this._assertLoaded ()
    return this.selectObject (this.index [uuid])
  }


  // ### Create / within Folder

  createFolder (name = 'New Directory', cb) {
    const parent = this._assertIn (Folder)
    const folder = new Folder (name, parent.uuid)
    this._writeObject (folder) .then (cb) // .catch (cb)
    this.selection = folder
    return this
  }

  createNotebook (name = 'New Notebook', pageData, cb) {
    const folder = this._assertIn (Folder)
    const notebook = new Notebook (name, folder.uuid)
    const pageId = notebook.content.pages[0] // first page // uuidgen ()
    const writeMeta = this._writeObject (notebook)
    const writePage = this._writePage (notebook, pageId, pageData)
    Promise.all ([writeMeta, writePage]) .then (cb) //.catch (cb)
    this.selection = notebook
    return this
  }

  importPDFInPlace (fpath, cb) {
    this._importPDF (fpath, { copy:false }) .then (cb)
    return this
  }

  importPDF (fpath, cb) {
    this._importPDF (fpath, { copy:true }) .then (cb)
    return this
  }

  // ### Create / within Notebook

  addPage (pageData, cb) {
    const notebook = this._assertIn (Notebook)
    const pageId = new NotebookPage () .uuid
    notebook.content.pages.push (pageId)
    const updateMeta = fs.writeFile (`${location}/${notebook.uuid}.content`,  JSON.stringify (notebook.content, null, 2))
    // TODO allow passing Page objects
    const writePage  = fs.writeFile (`${location}/${notebook.uuid}/${pageId}.rm`, pageData)
    Promise.all ([updateMeta, writePage]) .then (cb) // .catch (cb)
    return pageId
  }


  // ### Update

  // folders and notebooks, pages not yet

  // NB xochitl uses '' (for myFiles) and 'trash' as special 'uuids'.
  // Moving a file to the trash is done by setting its parent uuid to 'trash'.
  // Emptying the trash, actually does not delete the files, instead it sets 
  // metadata.deleted to true, and metadata.parent to ''.

  async moveToMyFiles () {
    return await this.moveTo ('')
  }

  async moveToTrash () {
    return await this.moveTo ('trash')
  }
  
  async moveTo (parentUUID) {
    this._assertNonRoot ()
    // FIXME, check parent type as well eh?
    // FIXME prevent cycles
    // TODO else throw error?
    if (parentUUID in this.index) {
      const patch = { parent:parentUUID, metadatamodified:false, synced:false }
      return await this._updateMetadata (this.selection, patch)
    }
    return this
  }

  async removeFromFavorites () {
    const patch = { pinned:false, metadatamodified:false, synced:false }
    return await this._updateMetadata (this.selection, patch)
  }

  async addToFavorites () {
    const patch = { pinned:true, metadatamodified:false, synced:false }
    return await this._updateMetadata (this.selection, patch)
  }

  emptyTrash () {
    // Also, if selection is in the trash, then change that
    // FIXME allTrash does not work that way; instead we have to do a traversal :(
    //  ... searching their parents upwards, to the 'trash' 'uuid'.
  }

  purgeDeleted () {
    // TODO research what possible and exts can occur
    const exts = [ '', '.cache', '.content', '.highlights', '.metadata', '.pagedata', '.pdf', '.epub', '.textconversion', '.thumbnails' ]
    for (const item of this.deleted.children) if (item.metadata.deleted) {
      for (const ext of exts) {
        const fpath = `${location}/${item.uuid}${ext}`
        fs.rm (fpath, { force:true, recursive:true })
      }
    }
    return this
  }
  

  // ### private

  _assertIn (constructor) {
    if (this.selection.constructor !== constructor)
      throw new Error ('must be called in a ' + constructor.name)
    return this.selection
  }

  _assertNonRoot () {
    if (this.selection === this.myFiles)
      throw new Error ('cannot be called on "My Files"')
    if (this.selection === this.trash)
      throw new Error ('cannot be called on "Trash"')
  }

  _assertLoaded () {
    if (!this.loaded)
      throw new Error ('requires building a database index from the filesystem')
  }


  // readers

  async _readIndex () {
    // TODO prevent reading twice then?
    // And listen for fs events?
    const ls = await fs.readdir (location)
    const readers = []
    for (const name of ls) {
      const match = /^([0-9a-f\-]{36})\.metadata$/.exec (name)
      if (match) readers [readers.length] = this._loadEntity (match [1])
    }
    await Promise.all (readers)
    return (this.loaded = true, this)
  }

  async _readJSON (uuid, ext = '') {
    let data = await fs.readFile (`${location}/${uuid}${ext}`)
    try { data = JSON.parse (data) }
    catch (e) { throw new SyntaxError (uuid + ext + ' ' + e.message) }
    return data
  }

  async _loadEntity (uuid) {

    const metadata =
      await this._readJSON (uuid, '.metadata')

    const content
      = metadata.type !== 'DocumentType' ? null
      : await this._readJSON (uuid, '.content')

    const proto =
      ( metadata.type === 'CollectionType' ? Folder
      : content?.fileType === 'notebook'   ? Notebook
      : content?.fileType === 'pdf'        ? PDFDocument
      : content?.fileType === 'epub'       ? EPubDocument
      : UnknownEntity ) .prototype

    const name = metadata.visibleName
    const item = setProto ({ name, uuid, metadata }, proto)
      if (content) item.content = content

    // If the uuid is already present as an UnknownEntity in the db,
    // then adopt its children

    if (this.index [uuid] && this.index [uuid] instanceof UnknownEntity)
      item.children = this.index.children

    // Add the item to the db / index

    this.index [uuid] = item
    if (metadata.pinned)  this.favorites.children.push (item)
    if (metadata.deleted) this.deleted.children.push (item)
    if (metadata.parent != null) { // NB adds placeholder parent if missing
      const parent = this.index [metadata.parent] || new UnknownEntity (metadata.parent)
      parent.children = parent.children ?? []
      parent.children.push (item)
    }
    
    return item
  }

  // writers

  async _updateMetadata (obj, patch) {
    // NB currently updates by reading from fs, not index
    // FIXME fail if selection is a page
    this._assertNonRoot ()
    const { uuid } = obj
    const meta = await this._readJSON (uuid, '.metadata')
    await fs.writeFile (fpath, JSON.stringify (assign (meta, patch), null, 2))
    return this
  }

  async _writeObject (obj) {
    const { uuid, metadata, content = null } = obj
    const p1 = fs.writeFile (`${location}/${uuid}.metadata`, JSON.stringify (metadata, null, 2))
    const p2 = content ? fs.writeFile (`${location}/${uuid}.content`,  JSON.stringify (content, null, 2)) : Promise.resolve (null)
    await Promise.all ([p1, p2])
  }
  
  async _writePage (notebook, pageId, pageData) {
    const filepath = `${location}/${notebook.uuid}/${pageId}.rm`
    await fs.mkdir (`${location}/${notebook.uuid}/`, { recursive:true })
    if (pageData instanceof Page) {
      const ws = createWriteStream (filepath)
      const r = new PageWriter () .writePage (pageData) .end ()
      await _writeBuffers (filepath, r.bufferList)
    }
    else
      await fs.writeFile (filepath, pageData)
  }

  async _importPDF (fpath, { copy = false }, cb) {
    const folder = this._assertIn (Folder)
    const match = /^(.*[/])?([^/]+)[.](pdf|PDF)$/ .exec (fpath)
    if (!match) throw new Error ('source file does not have a .pdf extension')
    // TODO: when should selection be set, then?
    // REVIEW, use fs.exists and do the others in parallel?
    const document = this.selection = new PDFDocument (match[2], folder.uuid)
    const copyFile = await (copy ? fs.copyFile : fs.rename) (fpath, `${location}/${document.uuid}.pdf`)
    const writeMeta = await this._writeObject (document)
    return this
  }

}

// By default do read the index from the fs
if (options.readIndex != false)
  await (db.readIndex ())
return db
}

// ...
function _writeBuffers (fpath, buffers) {
  return new Promise ((resolve, reject) => {
    const ws = createWriteStream (fpath)
      ws.on ('finish', resolve)
      ws.on ('error', reject)
    for (const x of buffers) ws.write (x)
    ws.end ()
  })
}

// Exports
// -------

export { openXochitlDB }