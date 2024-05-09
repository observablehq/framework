# Apache Parquet data loader

Here’s a JavaScript data loader that generates a random walk for each day in 2022 and outputs an Apache Parquet file to standard out.

```js run=false
import * as Arrow from "apache-arrow";
import * as Parquet from "parquet-wasm";

// Generate a daily random walk as parallel arrays of {date, value}.
const date = [];
const value = [];
const start = new Date("2022-01-01");
const end = new Date("2023-01-01");
for (let currentValue = 0, currentDate = start; currentDate < end; ) {
  date.push(currentDate);
  value.push(currentValue);
  (currentDate = new Date(currentDate)), currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  currentValue += Math.random() - 0.5;
}

// Construct an Apache Arrow table from the parallel arrays.
const table = Arrow.tableFromArrays({date, value});

// Output the Apache Arrow table as a Parquet table to standard out.
const parquetTable = Parquet.Table.fromIPCStream(Arrow.tableToIPC(table, "stream"));
const parquetBuilder = new Parquet.WriterPropertiesBuilder().setCompression(Parquet.Compression.ZSTD).build();
const parquetData = Parquet.writeParquet(parquetTable, parquetBuilder);
process.stdout.write(parquetData);
```

<div class="note">

To run this data loader, you’ll need to install `apache-arrow` and `parquet-wasm` using your preferred package manager such as npm or Yarn.

</div>

The above data loader lives in `data/samples.parquet.js`, so we can load the data using `data/samples.parquet`. The `FileAttachment.parquet` method parses the file and returns a promise to an Apache Arrow table.

```js echo
const samples = FileAttachment("./data/samples.parquet").parquet();
```

The `samples` table has two columns: `date` and `value`. We can display the table using `Inputs.table`, though note that the `date` column is represented as numbers intead of `Date` instances — some information was lost when serialized as Parquet. (Perhaps in the future the Apache Arrow JavaScript library could return `Date` instances for date columns? Though this is typically much slower than representing dates as numbers in typed arrays.) We use the **format** option to make these dates readable.

```js echo
Inputs.table(samples, {
  format: {
    date: (x) => new Date(x).toISOString().slice(0, 10)
  }
})
```

Lastly, we can pass the table to `Plot.plot` to make a simple line chart. Again, since the `date` column is numbers, Plot will interpret these as quantitative values by default; by setting the **type** of the *x* scale to *utc*, we tell Plot to treat these values as dates intead, producing a more readable axis.

```js echo
Plot.plot({
  x: {
    type: "utc" // treat x-values as dates, not numbers
  },
  marks: [
    Plot.ruleY([0]),
    Plot.lineY(samples, {x: "date", y: "value"})
  ]
})
```
