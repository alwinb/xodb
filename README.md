XoDB / reMarkable
=================

**Status: version 0.1.0 - work in progress.**

A javascript library for navigating, reading and writing to the notebook database of the [reMarkable] paper tablet. 

**NB**: This does not use the reMarkable cloud.

The library includes:

- A filesystem reader/ writer // a notebook database class.
- A simple object model for notebook pages.
- A parser and a writer for the `.rm` file format.
- A typesetter that converts text to lines, using the wonderful [Hershey fonts]. 

The library can be used on a local copy of the filesystem of the reMarkable tablet (synchronised with rsync over ssh, for example). 
The library also works on the device itself, but that does require installing node.js on the reMarkable.  
Another use case is in the web browser, to support custom-built web interfaces for the tablet. I plan on publishing more about that later. 

The package is called **xodb**, after _xochitl_, which is the name of the process that presents the user interface on the reMarkable tablet.

[reMarkable]: https://remarkable.com
[Hershey fonts]: https://en.wikipedia.org/wiki/Hershey_fonts


API
---

### XochitlDB

A **XochitlDB** instance represents the xochitl file-system/ notebook database _with_ a cursor
into it. The cursor is similar to the notion of a working directory, or a single selected item.

The methods that modify the database, do so relative to the cursor. 
The cursor always points at a single **XochitlEntity**, which is of one of the following object-types:

- Folder { uuid:string, metadata:object }
- Notebook { uuid:string, metadata:object, content:object }
- PDFDocument { uuid:string, metadata:object, content:object }
- EPubDocument { uuid:string, metadata:object, content:object }
- NotebookPage { uuid:string, metadata: { parent:string } }

The **XochitlDB** class has the following methods to navigate and manipulate XochitlDB entries.

- constructor (path: string)
- async readIndex ()
- selectMyFiles ()
- selectTrash ()
- selectFavorites ()
- selectById (uuid: string)
- selectByName (...namePath)
- selectObject (entry)
- createFolder (name, cb)
- createNotebook (name, firstPageData, cb)
- importPDF (path, cb)
- importPDFInPlace (path, cb)
- async moveTo (parentUUID: string)
- async moveToTrash ()
- emptyTrash ()


### Page

A **Page** object represents the contents of a NotebookPage entity. Page objects are tree structures that are composed of objects of the following types:

- Page { uuid: string, layers: [ Styled | Polyline | RawLine | Rect | Text | TextBox ] }
- Styled { children: [ Styled | Polyline | RawLine | Rect | Text | TextBox ], ...styleProps }
- Polyline { data: [number] } — with data an array of even length: x1, y1, …, xn, yn.
- RawLine { pen, color, unknown1, strokeWidth, unknown2, points }  
  — with points an array of tuples [x, y, speed, direction, width, pressure]
- Rect { x, y, w, h }
- Text { x, y, data: [string] }
- TextBox { x, y, w, h, data: [string] }

Page objects may be written out as `.rm` files. **Note** that this may result in a loss of information: nested style annotations are flattened; and rectangles and characters are converted to polylines. 


### Styled

The Polyline, RawLine, Rect, Text and TextBox objects can be wrapped in a **Styled** object to modify their presentation. Styled objects can also be nested to override style properties of their ancestors. Currently the following style properties are supported:

- pen
- color
- strokeWidth
- fontName
- fontSize
- lineHeight // for TextBox, WIP


License
-------

Mozilla Public License Version 2.0
