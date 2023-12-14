# JavaScript: Files

Dashboards and reports need to present data as quickly, accurately, and completely as possible to their readers. This is supported in Observable Markdown through **file attachments**.

File attachments can be static files added to the docs folder, like a CSV file that contains your data. They can also be generated on-the-fly by a [data loader](../loaders).

For speed, you’ll want to minimize the data that is sent to the browser, by doing aggregations and selections at build time. For a chart that only displays a sum total of transactions per hour, for example, the page shouldn’t need to download the details of _every_ transaction. Shipping a static snapshot of the data, captured at build time, ensures that every reader sees the same data.

This approach also helps you comply with security and privacy requirements, since the built site only includes the referenced file attachments, the contents that ships to your web server can easily be listed and audited. Any proprietary information, such as API keys for web services or database connection credentials —and more generally, any information not meant to be displayed— stay secure.

## Reading file attachments

You can load files from a page with the built-in `FileAttachment` function. This is available by default in Markdown, but you can import it like so:

```js echo
import {FileAttachment} from "npm:@observablehq/stdlib";
```

`FileAttachment` supports many common data formats, including CSV, TSV, JSON, Apache Arrow and Apache Parquet, and SQLite. For example, here’s how to load a CSV file:

```js echo
const gistemp = FileAttachment("gistemp.csv").csv({typed: true});
```

The value of `gistemp` above is a [Promise](./promises) to an array of objects. In other code blocks, the promise is resolved implicitly and hence you can refer to it as an array of objects.

```js echo
gistemp
```

For CSV and TSV files, you can also access the columns:

```js echo
gistemp.columns
```

A usual pitfall with CSV (and TSV) files is that they are not typed: numbers and dates are represented in the same way as strings, and there is no way to automatically determine the correct type. For example, if you are working on a choropleth map which assigns a color to each US state based on its [FIPS code](https://transition.fcc.gov/oet/info/maps/census/fips/fips.txt), Alabama will be encoded as "01" and Michigan as "26" — these should be treated as strings. Dates might be represented as ISO 8601 strings such as `YYYY-MM-DD`, or through some other format.

The FileAttachment csv (and tsv) methods support the **typed** option, which can be one of:

- false - keep everything as strings (default)
- true - apply a value-based heuristic
- *auto* - apply a column-based heuristic

If the file is compatible with true or *auto*, then fine! If the file is not compatible, the typing may produce unexpected or invalid results. You should inspect the returned data and if needed use `{typed: false}` (the default) and coerce the types yourself.

The following example shows how to type the Date and Anomaly columns of the gistemp.csv file:

```js run=false
import {utcParse} from "npm:d3-time-format";

const parseDate = utcParse("%Y-%m-%d");
const coerceRow = (d) => ({Date: parseDate(d.Date), Anomaly: Number(d.Anomaly)});
const gistemp = FileAttachment("gistemp.csv").csv().then((D) => D.map(coerceRow));
```

With this explicit function, any Date value that does not match the expected format will be cast as an `Invalid Date`, and any Anomaly value that is not a number (maybe the file says "N/A" in those places) will be cast as `NaN`.

Coercing types as early as possible is important as it makes data exploration easier (for example [Plot](../lib/plot) uses the types to determine the applicable scales and color schemes), and less susceptible to unexpected errors—such as when a "N/A" field breaks the determination of a median value.

## Images

All types of images can be added, in any of the formats suppoerted by the browser: PNG, JPEG, gif, WebP, TIFF, SVG, etc. The simplest way to display an image is to use the image method:

```js echo
FileAttachment("../us-counties-four-colors.png").image({width: 640})
```

If you need to work with the image contents in JavaScript, you can either write it to a canvas element and read the bytes with [context.getImageData](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/getImageData). Or, you can load the image as an array buffer, and process its format yourself. For example, to read the [EXIF](https://en.wikipedia.org/wiki/Exif) metadata with [ExifReader](https://github.com/mattiasw/ExifReader):

```js echo
import ExifReader from "npm:exifreader";
const buffer = await FileAttachment("../us-counties-four-colors.png").arrayBuffer();
const exif = await ExifReader.load(buffer);
display(exif);
```

## Audio and video

For audio or video contents, you will need to use the file.url() method, and build a player element with the source URL it returns (as a Promise). For example:

```js
FileAttachment("../plot-cli.mp4").url().then((src) => html`<video ${{
  src,
  autoplay: "autoplay",
  muted: "muted",
  controls: "controls",
  style: "max-width: 640px"
}}>`)
```

## Supported formats

The following type-specific methods are supported:

- `arrayBuffer()`
- `arrow({version})`
- `blob()`
- `csv({array, typed})`
- `html()`
- `image(props)`
- `json()`
- `sqlite()`
- `stream()`
- `text()`
- `tsv({array, typed})`
- `xlsx()`
- `xml(mimeType)`
- `zip()`

Each method returns a promise to the file’s contents (or URL).

TK Describe what `file.zip()` returns.

The 

## Static analysis

We use static analysis to determine which files are used so that we can include only referenced files when building. The `FileAttachment` function accepts only literal strings; code such as `FileAttachment("my" + "file.csv")` or similar dynamic invocation is invalid syntax. If you have multiple files, you need to enumerate them explicitly like so:

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

Note that just declaring a `FileAttachment` does not load the file. Hence above, none of the files in `frames` are loaded until requested, for example by saying `frames[0].image()`.

You can also work directly with `FileAttachment` instances:

```js echo
const file = FileAttachment("gistemp.csv");
```

TK Describe `file.name` and `file.mimeType`.

```js echo
file
```

