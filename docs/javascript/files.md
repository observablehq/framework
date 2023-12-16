# JavaScript: Files

Load files — whether static or generated dynamically by a [data loader](../loaders) — using the built-in `FileAttachment` function. This is available by default in Markdown, but you can import it explicitly like so:

```js echo
import {FileAttachment} from "npm:@observablehq/stdlib";
```

The `FileAttachment` function takes a path and returns a file handle. This handle exposes the file’s name and [MIME type](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types).

```js echo
FileAttachment("volcano.json")
```

Like a local [import](./imports), the path is relative to the calling code’s source file: either the page’s Markdown file or the imported local JavaScript module. (To load a remote file, use [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API), or use a [data loader](../loaders) to download the file at build time.)

Calling `FileAttachment` doesn’t actually load the file; the contents are only loaded when you invoke a [file contents method](#supported-formats). For example, to load a JSON file:

```js echo
const volcano = FileAttachment("volcano.json").json();
```

The value of `volcano` above is a [promise](./promises). In other code blocks, the promise is resolved implicitly and hence you can refer to the resolved value directly.

```js echo
volcano
```

### Static analysis

The `FileAttachment` function can _only_ be passed a static string literal; constructing a dynamic path such as `FileAttachment("my" + "file.csv")` is invalid syntax. Static analysis is used to invoke [data loaders](../loaders) at build time, and ensures that only referenced files are included in the generated output during build.

If you have multiple files, you need to enumerate them explicitly like so:

```js run=false
const frames = [
  FileAttachment("frame1.png"),
  FileAttachment("frame2.png"),
  FileAttachment("frame3.png"),
  FileAttachment("frame4.png"),
  FileAttachment("frame5.png"),
  FileAttachment("frame6.png"),
  FileAttachment("frame7.png"),
  FileAttachment("frame8.png"),
  FileAttachment("frame9.png")
];
```

None of the files in `frames` above are loaded until a [content method](#supported-formats) is invoked, for example by saying `frames[0].image()`.

## Supported formats

The `FileAttachment` class supports a variety of methods for loading file contents:

| method             | return type                                 | supporting library
| -                  | -                                           | -
| `file.arrayBuffer` | [`ArrayBuffer`][1]                          | -
| `file.arrow`       | [`Table`][2]                                | [Apache Arrow](../lib/arrow)
| `file.blob`        | [`Blob`][3]                                 | -
| `file.csv`         | [`Array`][4] (of objects or arrays)         | [D3](../lib/csv)
| `file.html`        | [`Document`][5]                             | -
| `file.image`       | [`HTMLImageElement`][6]                     | -
| `file.json`        | [`Array`][4], [`Object`][7], or other value | -
| `file.parquet`     | [`Table`][2]                                | [Apache Arrow, parquet-wasm](../lib/arrow)
| `file.sqlite`      | [`SQLiteDatabaseClient`](../lib/sqlite)     | [SQLite](../lib/sqlite)
| `file.stream`      | [`ReadableStream`][8]                       | -
| `file.text`        | [`string`][9]                               | -
| `file.tsv`         | [`Array`][4] (of objects or arrays)         | [D3](../lib/csv)
| `file.xlsx`        | [`Workbook`](../lib/xlsx)                   | [ExcelJS](../lib/xlsx)
| `file.xml`         | [`XMLDocument`][10]                         | -
| `file.zip`         | [`ZipArchive`](../lib/zip)                  | [JSZip](../lib/zip)
| `file.url`         | [`string`][9]                               | -

[1]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer
[2]: https://arrow.apache.org/docs/js/classes/Arrow_dom.Table.html
[3]: https://developer.mozilla.org/en-US/docs/Web/API/Blob
[4]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array
[5]: https://developer.mozilla.org/en-US/docs/Web/API/Document
[6]: https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement
[7]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object
[8]: https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream
[9]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String
[10]: https://developer.mozilla.org/en-US/docs/Web/API/XMLDocument

While the contents often dictate the appropriate method — for example, an Apache Arrow file is almost always read with `file.arrow` — when multiple methods are valid, chose based on your needs. For example, you can load a CSV file using `file.text` to implement parsing yourself instead of using D3.

## Basic formats

The following common basic formats are supported natively.

### Text

To load a humble text file, use `file.text`:

```js echo
const hello = FileAttachment("hello.txt").text();
```

```js echo
hello
```

By default, `file.text` expects the file to be encoded in [UTF-8](https://en.wikipedia.org/wiki/UTF-8). To use a different encoding, pass the [desired encoding](https://developer.mozilla.org/en-US/docs/Web/API/Encoding_API/Encodings) name to `file.text`.

```js echo
const pryvit = FileAttachment("pryvit.txt").text("utf-16be");
```

```js echo
pryvit
```

### JSON

To load a [JSON (JavaScript Object Notation)](https://www.json.org/) file, use `file.json`

```js echo
FileAttachment("volcano.json").json()
```

A common gotcha with JSON is that it has no built-in date type; dates are therefore typically represented as ISO 8601 strings, or as a number of milliseconds or seconds since UNIX epoch.

### Media

To load an image, use `file.image`:

```js echo
FileAttachment("horse.jpg").image()
```

Of course, if you just want to display the image, you can use a static image in HTML or Markdown.

![horse](./horse.jpg)

<img src="./horse.jpg">

```md
![horse](./horse.jpg)
```

<!-- All types of images can be added, in any of the formats supported by your browser: PNG, JPEG, gif, WebP, TIFF, SVG, etc. The simplest way t -->

The options, if any, are assigned directly as properties of the [Image](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/Image) element; for example, you can set an image’s _width_ and _height_, a _style_ attribute, or the _alt_ attribute like above.

When you need to work with the image pixels or raw contents, you will either write the image to a canvas element, then read the bytes with [context.getImageData](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/getImageData).

For audio or video contents, you will use the `file.url()` method to build a player element with the source URL it returns (as a promise). For example:

```js echo
html`<video ${{
  src: await FileAttachment("horse.mp4").url(),
  autoplay: true,
  muted: true,
  loop: true,
  controls: true
}}>`
```

### Markup

The `file.xml(mimeType)` method read a [XML]() file and returns a promise to a [XMLDocument](https://developer.mozilla.org/en-US/docs/Web/API/XMLDocument) containing the contents of the file. It takes a single argument with the file’s MIME-type, which defaults to `"application/xml"`.

The `file.html()` method reads an [HTML](https://developer.mozilla.org/en-US/docs/Web/HTML) file and returns a Document which you can [traverse](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Traversing_an_HTML_table_with_JavaScript_and_DOM_Interfaces) with the standard methods, or manipulate with [D3](../lib/d3). `file.html()` is equivalent to `file.xml("text/html")`.

## Binary formats

You can also get a [ReadableStream](https://streams.spec.whatwg.org/#rs) if you want to read a file incrementally:

```js echo run=false
function* chunk() {
  const stream = await FileAttachment("example.shp").stream();
  const reader = stream.getReader();
  let done, value;
  while (({done, value} = await reader.read()), !done) {
    yield value;
  }

for (const value of chunk) { … do something with the value … }
```

Likewise, call `file.blob()` to get a [Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob).

Or, you can load the image into an array buffer, and process its raw format directly. For example, to read the [EXIF](https://en.wikipedia.org/wiki/Exif) metadata of a picture with [ExifReader](https://github.com/mattiasw/ExifReader):

```js echo
import ExifReader from "npm:exifreader";
```

```js echo
FileAttachment("horse.jpg").arrayBuffer().then(ExifReader.load)
```

(Image from [Eadweard Muybridge](https://www.loc.gov/search/?fa=contributor:muybridge,+eadweard)’s studies of animal locomotion.)
