# Comma-separated values (CSV and TSV)

Data is often stored in text files using a [delimiter-separated values](https://d3js.org/d3-dsv) format. For example, here’s how to load a file with comma-separated values (CSV):

```js echo
const gistemp = FileAttachment("gistemp.csv").csv({typed: true});
```

The value of `gistemp` above is a [promise](./promises) to an array of objects. In other code blocks, the promise is resolved implicitly and hence you can refer to it as an array of objects.

```js echo
gistemp
```

The column names are listed in the `columns` property:

```js echo
gistemp.columns
```

Our implementation is based on [RFC 4180](https://datatracker.ietf.org/doc/html/rfc4180).

## Type coercion

A usual pitfall with these formats is that they are not typed: numbers and dates are represented in the same way as strings, and there is no way to automatically determine the correct type. For example, if you are working on a choropleth map which assigns a color to each US state based on its [FIPS code](https://transition.fcc.gov/oet/info/maps/census/fips/fips.txt), Alabama will be encoded as "01" and Michigan as "26" — and these should be treated as strings when looking up the values in your dataset. Dates might be represented as ISO 8601 strings such as `YYYY-MM-DD`, or through some other format.

The `file.csv()` and `file.tsv()` methods support the `typed` option, which can be one of:

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
