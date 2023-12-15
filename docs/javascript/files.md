# JavaScript: Files

Dashboards and reports need to present data as quickly, accurately, and completely as possible to their readers. This is supported in Observable Markdown through **file attachments**.

File attachments can be static files added to the docs folder, like a CSV file that contains your data. They can also be generated on-the-fly by a [data loader](../loaders).

For speed, you’ll want to minimize the data that is sent to the browser, by doing aggregations and selections at build time. For a chart that only displays a sum total of transactions per hour, for example, the page shouldn’t need to download the details of _every_ transaction. Shipping a static snapshot of the data, captured at build time, ensures that every reader sees the same data.

This approach also helps you comply with security and privacy requirements, since the built site only includes the referenced file attachments, the contents that ships to your web server can easily be listed and audited. Any proprietary information, such as API keys for web services or database connection credentials —and more generally, any information not meant to be displayed— stay secure.

## Reading files

You can load files from a page with the built-in `FileAttachment` function. This is available by default in Markdown, but you can import it like so:

```js echo
import {FileAttachment} from "npm:@observablehq/stdlib";
```

The `FileAttachment` function returns a `file` object that shows the file’s name and [MIME type](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types):

```js echo
FileAttachment("gistemp.csv")
```

Note: we use a [standard mapping](https://www.npmjs.com/package/mime) of file extensions to types. However, the actual MIME type is ultimately decided by your web server.

The resulting `file` supports many common data formats, with type-specific methods:

- `arrayBuffer()` - for [binary](#binary) data
- `arrow({version})` - for [Arrow](#apache-arrow) files
- `blob()` - for [binary](#binary) data
- `csv({array, typed})` - for [CSV](#csv-tsv) files
- `html()`
- `image(props)` - for [images](#images)
- `json()` - for [JSON](#json) files
- `parquet()` - for [Parquet](#apache-parquet) files 
- `sqlite()` - for [SQLite](#sqlite) databases
- `stream()` - for [binary](#binary) data
- `text()` - for [text](#text)
- `tsv({array, typed})` - for [TSV](#csv-tsv) files
- `xlsx()` - for [spreadsheets](#xlsx)
- `xml(mimeType)`
- `zip()`

Note: though the names of the methods are similar to the extension, it is not a 1-1 mapping. The method you choose depends on the actual type of the file’s contents, and on what you want to do with it. For example, it is legal to read a .txt file with the `file.csv()` method, if the file contains comma-separated values.

Each method returns a promise to the file’s contents (or URL).

## Text

To load text from a humble text file (like the source code of this very page), use `file.text()`:

```js echo
const source = await FileAttachment("files.md").text();
display(html`<em>This page has ${source.split("\n\n").length} paragraphs.`)
```

This method expects the file to be encoded in [UTF-8](https://en.wikipedia.org/wiki/UTF-8). (If this is not the case, use [TextDecoder](https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder).)

## CSV, TSV

Data is often stored in text files using a [delimiter-separated values](https://d3js.org/d3-dsv) format. For example, here’s how to load a file with comma-separated values (CSV):

```js echo
const gistemp = FileAttachment("gistemp.csv").csv({typed: true});
```

The value of `gistemp` above is a [Promise](./promises) to an array of objects. In other code blocks, the promise is resolved implicitly and hence you can refer to it as an array of objects.

```js echo
gistemp
```

For CSV and tab-separated values (TSV) files, you can also access the columns:

```js echo
gistemp.columns
```

Our implementation of CSV and TSV is based on [RFC 4180](https://datatracker.ietf.org/doc/html/rfc4180). A usual pitfall with these formats is that they are not typed: numbers and dates are represented in the same way as strings, and there is no way to automatically determine the correct type. For example, if you are working on a choropleth map which assigns a color to each US state based on its [FIPS code](https://transition.fcc.gov/oet/info/maps/census/fips/fips.txt), Alabama will be encoded as "01" and Michigan as "26" — these should be treated as strings. Dates might be represented as ISO 8601 strings such as `YYYY-MM-DD`, or through some other format.

The `file.csv()` and `file.tsv()` methods support the **typed** option, which can be one of:

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

The `file.csv()` and `file.tsv()` methods assume that the first line of the file is a header indicating the (distinct) name of each column. Each subsequent line is considered as a row and converted to an object with the column names as keys. If your file does not have such a header line, pass the `array: true` option like so:

```js echo
FileAttachment("gistemp.csv").csv({array: true})
```

Each row is then converted to an array of values.

## JSON

The [JSON](https://en.wikipedia.org/wiki/JSON) format is a common way to serialize non-tabular data such as networks and hierarchies, or data with multivalued fields (_e.g._, tags). The `file.json()` method returns a Promise to a JavaScript object:

```js echo
FileAttachment("../data/miserables.json").json()
```

See [D3](../lib/d3) for a complete example.

## Databases

The following formats encode databases or tables:

- parquet - the [Apache Parquet](https://parquet.apache.org/) format, optimized for storage and transfer
- arrow - the [Apache Arrow](https://arrow.apache.org/) format, optimized for inter-process communications
- xlsx - the ubiquitous [spreadsheet format](https://en.wikipedia.org/wiki/Office_Open_XML)
- sqlite - the [SQLite](https://www.sqlite.org/fileformat.html) database format

Files in these formats bear the corresponding extension, and are consumed by the FileAttachment method of the same name.

### Apache Parquet

For instance, to load a Parquet file into memory:

```js echo
const schools = FileAttachment("../data/schools.parquet").parquet();
```

```js echo
Plot.plot({
  projection: "albers-usa",
  marks: [
    Plot.dot(schools, {x: "LONGITUD", y: "LATITUDE"})
  ]
})
```

To load Parquet files with FileAttachment, as described above, we use [parquet-wasm](https://kylebarron.dev/parquet-wasm/).

Another common way to consume Parquet files is to run SQL queries on them with the [DuckDB](../lib/duckdb) database engine. The parquet format is optimized for this use case: the data being compressed and organized by column, DuckDB does not have to load all the data if the query only necessitates an index and a column. This can give a huge performance boost when working with large data files in interactive pages.

### Apache Arrow

[Apache Arrow](https://arrow.apache.org/) is the pendant of the Parquet format once the data is loaded into memory. It is used by [Arquero](../lib/arquero), [DuckDB](../lib/duckdb), and other libraries, to handle data efficiently.

Though you will rarely consume this format directly, it is sometimes saved to disk as .arrow files, which you can load with `file.arrow()`.

The Arrow format supports different versions (namely: 4, 9 and 11), which you can specify like so:

```js echo
FileAttachment("file.arrow").arrow({version: 9})
```

The [Arrow](../lib/arrow) page shows how to use the arrow format to work with data-frames.

### XLSX

The `file.xlsx()` method uses [ExcelJS](https://github.com/exceljs/exceljs) to load a spreadsheet’s _values_ (not the formulae) into arrays of objects. It works in two stages: in the first stage, you load the spreadsheet, which returns a Workbook object, allowing you to determine the list of sheet names as its _workbook_.sheetNames property.

```js echo
const workbook = await FileAttachment("../data/laser-report.xlsx").xlsx();
display(workbook);
```

If you inspect the output of this code, you can see that the workbook includes an array of the sheet names in the original file. The `sheetNames` property (e.g. `workbook.sheetNames`) will also return an array of sheet names. 

Access individual sheets of the XLSX file by name or number:

```js echo
const sheet1 = await workbook.sheet("Laser Report 2020");
display(sheet1);
```

The `sheet(name[, {range, headers}])` method takes optional parameters:
- `name`: a string or number representing the sheet from which you plan to extract data.
- `range`: a string specifying a rectangular range of cells to extract from the sheet. For example, "B4:K123" specifies a range from top-left cell B4 to bottom-right cell K123, inclusive. 
- `headers`: a Boolean that, if true, will treat the first extracted row as column headers and use its cells as field names in returned objects. The default is false.

When you call the data from a specific sheet, we return an array of objects representing those cell values. There are a few situations to note:

- Values are coerced to their corresponding JavaScript types: numbers, strings, Date objects.
- Dates are interpreted in UTC.
- Formula results are included, but formula definitions ignored. Formula errors are coerced to `NaN`.
- Hyperlinks are returned as strings, with a space between URL and text if they differ.
- Empty cells are skipped: objects will not include fields or values for them, but empty rows are kept.
- Row numbers from the source sheet are included as a non-enumerable `"#"` property to assist with recognition and range specification.

For our xlsx file above, we retrieve the headers by calling:

```js echo
const sheet2 = await workbook.sheet("Laser Report 2020", {headers: true});
display(Inputs.table(sheet2));
```

Or, supposing we only wanted to retrieve the first few rows:

```js echo
const sheet3 = await workbook.sheet("Laser Report 2020", {headers: true, range: "1:5"});
display(Inputs.table(sheet3));
```

### SQLite

Use `file.sqlite()` to load a [SQLite](https://www.sqlite.org/fileformat.html) database (version 3 and later). This method returns a Promise to a [SQLiteDatabaseClient](../lib/sqlite) instance.


## Images

All types of images can be added, in any of the formats supported by your browser: PNG, JPEG, gif, WebP, TIFF, SVG, etc. The simplest way to display an image is to use the `file.image()` method:

```js echo
FileAttachment("../us-counties-four-colors.png").image({width: 640})
```

The options, if any, are assigned directly as properties of the [Image](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/Image) element; for example, you can set an image’s *width* and *height*, or a *style* attribute.

When you need to work with the image pixels or raw contents, you will either write the image to a canvas element, then read the bytes with [context.getImageData](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/getImageData). Or, you can load the image into an array buffer, and process its raw format directly. For example, to read the [EXIF](https://en.wikipedia.org/wiki/Exif) metadata of a picture with [ExifReader](https://github.com/mattiasw/ExifReader):

```js echo
import ExifReader from "npm:exifreader";
const buffer = await FileAttachment("../us-counties-four-colors.png").arrayBuffer();
const exif = await ExifReader.load(buffer);
display(exif);
```

## Audio, video

For audio or video contents, you will use the `file.url()` method to build a player element with the source URL it returns (as a Promise). For example:

```js
FileAttachment("../plot-cli.mp4").url().then((src) => html`<video ${{
  src,
  autoplay: "autoplay",
  muted: "muted",
  controls: "controls",
  style: "max-width: 640px"
}}>`)
```

## Binary

You might want to work with binary data, such as a [shapefile](https://github.com/mbostock/shapefile). In these cases, a typical method is to use an [ArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer).

```js echo run=false
import shapefile from "npm:shapefile@0.6"
const collection = shapefile.read(await FileAttachment("example.shp").arrayBuffer())
```

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

