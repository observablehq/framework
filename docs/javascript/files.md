# JavaScript: Files

TK Should this be called “working with data”?

You can load files the built-in `FileAttachment` function. This is available by default in Markdown, but you can import it like so:

```js echo
import {FileAttachment} from "npm:@observablehq/stdlib";
```

`FileAttachment` supports many common data formats, including CSV, TSV, JSON, Apache Arrow, and SQLite. For example, here’s how to load a CSV file:

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

**Caution:** ⚠️ Using `{typed: true}` or [d3.autoType](https://d3js.org/d3-dsv#autoType) for CSV and TSV files is dangerous because it requires that the file must be compatible; for example, dates must be represented as ISO 8601 strings such as `YYYY-MM-DD`. If the file is not compatible, `{typed: true}` may produce unexpected results. You should inspect the returned data and if needed use `{typed: false}` (the default) and coerce the types yourself. You can also use `{typed: "auto"}` and hope for the best. 🤷

TK An example of coerce types yourself.

```js run=false
import {utcParse} from "npm:d3-time-format";

const parseDate = utcParse("%Y-%m-%d");
const coerceRow = (d) => ({Date: parseDate(d.Date), Anomaly: Number(d.Anomaly)});
const gistemp = FileAttachment("gistemp.csv").csv().then((D) => D.map(coerceRow));
```

TK An explanation of why coercing types as early as possible is important.

TK Mention [data loaders](../loaders) and archives.

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

TK Mention the sample datasets that are available by default in Markdown.
