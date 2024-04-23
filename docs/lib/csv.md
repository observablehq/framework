# Comma-separated values

To load a [comma-separated values](https://en.wikipedia.org/wiki/Comma-separated_values) (CSV) file, use [`FileAttachment`](../files)`.csv`. The `csv`, `tsv`, and `dsv` method implementations are based on [RFC 4180](https://datatracker.ietf.org/doc/html/rfc4180).

```js echo
const gistemp = FileAttachment("gistemp.csv").csv({typed: true});
```

The value of `gistemp` above is a [promise](../reactivity#promises) to an array of objects. In other code blocks, the promise is resolved implicitly and hence you can refer to it as an array of objects.

```js echo
gistemp
```

The column names are listed in the `columns` property:

```js echo
gistemp.columns
```

You can also load a tab-separated values (TSV) file using `FileAttachment.tsv`:

```js echo
const capitals = FileAttachment("us-state-capitals.tsv").tsv({typed: true});
```

```js echo
Inputs.table(capitals)
```

For a different delimiter, use `FileAttachment.dsv`. <a href="https://github.com/observablehq/framework/releases/tag/v1.6.0" class="observablehq-version-badge" data-version="^1.6.0" title="Added in 1.6.0"></a> For example, for semicolon separated values:

```js run=false
const capitals = FileAttachment("us-state-capitals.csv").dsv({delimiter: ";", typed: true});
```

## Type coercion

A common pitfall with CSV is that it is untyped: numbers, dates, booleans, and every other possible value are represented as text and there is no universal way to automatically determine the correct type.

For example, a map might identify U.S. states by [FIPS code](https://transition.fcc.gov/oet/info/maps/census/fips/fips.txt) — Alabama as `"01"`, Michigan as `"26"`, and so on — and these identifiers should be treated as strings when looking up the values in your dataset. But in other cases — say if `1` and `26` represent temperature in degrees Celsius — you should convert these values to numbers before doing math or passing them to [Observable Plot](./plot). If you don’t type your data, you may inadvertently concatenate when you meant to add, or get an ordinal rather than quantitative scale. You should type data as early as possible — when you load it — to prevent unexpected behavior later.

Dates can be particularly challenging in CSV as there are myriad ways to encode dates as text. We recommend [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) and [UTC](https://en.wikipedia.org/wiki/Coordinated_Universal_Time).

To coerce types automatically, set the **typed** option to true with `file.csv` or `file.tsv`. This uses [`d3.autoType`](https://d3js.org/d3-dsv#autoType) to infer types and then coerce them.

If your file is not compatible with `d3.autoType`, you may get unexpected or invalid results; you should inspect the returned data and if needed use `{typed: false}` (the default) and coerce the types yourself. Here is an example of coercing types manually using a custom date format:

```js run=false
import {utcParse} from "npm:d3-time-format";

const parseDate = utcParse("%Y-%m-%d");
const coerceRow = (d) => ({Date: parseDate(d.Date), Anomaly: Number(d.Anomaly)});
const gistemp = FileAttachment("gistemp.csv").csv().then((D) => D.map(coerceRow));
```

Above, any date value that does not match the expected format will be cast as an `Invalid Date`, and any anomaly value that is not a number (as when the file says `N/A` to represent missing data) will be cast as `NaN`.

The `file.csv` and `file.tsv` methods assume that the first line of the file is a header indicating the (distinct) name of each column. Each subsequent line is considered as a row and converted to an object with the column names as keys.

If your file does not have such a header line, set the **array** option to true to get back an array of arrays instead:

```js echo
FileAttachment("gistemp.csv").csv({array: true, typed: true})
```
