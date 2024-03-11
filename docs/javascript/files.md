---
keywords: file, fileattachment, attachment
---

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

The `FileAttachment` function can _only_ be passed a static string literal; constructing a dynamic path such as `FileAttachment("my" + "file.csv")` is invalid syntax. Static analysis is used to invoke [data loaders](../loaders) at build time, and ensures that only referenced files are included in the generated output during build. In the future [#260](https://github.com/observablehq/framework/issues/260), it will also allow content hashes for cache breaking during deploy.

If you have multiple files, you can enumerate them explicitly like so:

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

`FileAttachment` supports a variety of methods for loading file contents:

| method                       | return type
| -                            | -
| [`file.arrayBuffer`][binary] | [`ArrayBuffer`][array-buffer]
| [`file.arrow`][arrow]        | [`Table`][arrow-table]
| [`file.blob`][binary]        | [`Blob`][blob]
| [`file.csv`][csv]            | [`Array`][array]
| [`file.html`][markup]        | [`Document`][document]
| [`file.image`][media]        | [`HTMLImageElement`][image]
| [`file.json`][json]          | [`Array`][array], [`Object`][object], _etc._
| [`file.parquet`][arrow]      | [`Table`][arrow-table]
| [`file.sqlite`][sqlite]      | [`SQLiteDatabaseClient`][sqlite]
| [`file.stream`][binary]      | [`ReadableStream`][stream]
| [`file.text`][text]          | [`string`][string]
| [`file.tsv`][csv]            | [`Array`][array]
| [`file.xlsx`][xlsx]          | [`Workbook`][xlsx]
| [`file.xml`][markup]         | [`Document`][document]
| [`file.zip`][zip]            | [`ZipArchive`][zip]

[array-buffer]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer
[arrow-table]: https://arrow.apache.org/docs/js/classes/Arrow_dom.Table.html
[blob]: https://developer.mozilla.org/en-US/docs/Web/API/Blob
[array]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array
[document]: https://developer.mozilla.org/en-US/docs/Web/API/Document
[image]: https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement
[object]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object
[stream]: https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream
[string]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String
[binary]: #binary-formats
[basic]: #basic-formats
[arrow]: ../lib/arrow
[csv]: ../lib/csv
[markup]: #markup
[media]: #media
[json]: #json
[sqlite]: ../lib/sqlite
[text]: #text
[xlsx]: ../lib/xlsx
[zip]: ../lib/zip

The contents often dictate the appropriate method — for example, an Apache Arrow file is almost always read with `file.arrow`. When multiple methods are valid, choose based on your needs. For example, you can load a CSV file using `file.text` to implement parsing yourself instead of using D3.

In addition to the above, you can get the resolved absolute URL of the file using `file.url`. This returns a [promise](./promises) to a string:

```js echo
FileAttachment("volcano.json").url()
```

See [file-based routing](../routing#files) for additional details.

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

To display an image, you can use a static image in [Markdown](../markdown) such as `<img src="horse.jpg">` or `![horse](horse.jpg)`. Likewise, you can use a `video` or `audio` element. Per [file-based routing](../routing#files), static references to these files are automatically detected and therefore these files will be included in the built output.

<video src="horse.mp4" autoplay muted loop controls></video>

```html run=false
<video src="horse.mp4" autoplay muted loop controls></video>
```

If you want to manipulate an image in JavaScript, use `file.image`. For example, below we load an image and invert the RGB channel values.

<canvas id="horse-canvas" width="640" height="512" style="max-width: 100%;"></canvas>

```js echo
const canvas = document.querySelector("#horse-canvas");
const context = canvas.getContext("2d");
const horse = await FileAttachment("horse.jpg").image();
context.drawImage(horse, 0, 0, canvas.width, canvas.height);
const data = context.getImageData(0, 0, canvas.width, canvas.height);
for (let j = 0, k = 0; j < canvas.height; ++j) {
  for (let i = 0; i < canvas.width; ++i, k += 4) {
    data.data[k + 0] = 255 - data.data[k + 0];
    data.data[k + 1] = 255 - data.data[k + 1];
    data.data[k + 2] = 255 - data.data[k + 2];
  }
}
context.putImageData(data, 0, 0);
```

(The images above are from [Eadweard Muybridge](https://www.loc.gov/search/?fa=contributor:muybridge,+eadweard)’s studies of animal locomotion.)

### Markup

The `file.xml` method reads an XML file and returns a promise to a [`Document`](https://developer.mozilla.org/en-US/docs/Web/API/Document); it takes a single argument with the file’s MIME-type, which defaults to `"application/xml"`. The `file.html` method similarly reads an [HTML](https://developer.mozilla.org/en-US/docs/Web/HTML) file; it is equivalent to `file.xml("text/html")`.

## Binary formats

Load binary data using `file.blob` to get a [`Blob`][blob], or `file.arrayBuffer` to get an [`ArrayBuffer`][array-buffer]. For example, to read [Exif](https://en.wikipedia.org/wiki/Exif) image metadata with [ExifReader](https://github.com/mattiasw/ExifReader):

```js echo
import ExifReader from "npm:exifreader";

const buffer = await FileAttachment("horse.jpg").arrayBuffer();
const tags = ExifReader.load(buffer);

display(tags);
```

To read a file incrementally, get a [`ReadableStream`][stream] with `file.stream`. For example, to count the number of bytes in a file:

```js echo
const stream = await FileAttachment("horse.jpg").stream();
const reader = stream.getReader();
let total = 0;

while (true) {
  const {done, value} = await reader.read();
  if (done) break;
  total += value.length;
}

display(total);
```
