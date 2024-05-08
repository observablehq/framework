# Framework + Apache Arrow

Here’s a JavaScript data loader that generates a random walk for each day in 2022, and outputs an Apache Arrow table to standard out.

```js run=false
import * as Arrow from "apache-arrow";

const date = [];
const value = [];
const start = new Date("2022-01-01");
const end = new Date("2023-01-01");
for (let d = new Date(start), v = 0; d < end; d.setUTCDate(d.getUTCDate() + 1)) {
  date.push(new Date(d));
  value.push((v += Math.random() - 0.5)); // random walk
}

const table = Arrow.tableFromArrays({date, value});

process.stdout.write(Arrow.tableToIPC(table));
```

The above data loader lives in `data/samples.arrow.js`, so we can load the data using `data/samples.arrow`. The `FileAttachment.arrow` method parses the file and returns a promise to an Apache Arrow table.

```js echo
const samples = FileAttachment("./data/samples.arrow").arrow();
```

The `samples` table has two columns: `date` and `value`. We can display the table using `Inputs.table`, though note that the `date` column is represented as numbers intead of `Date` instances — some information was lost when serialized as Arrow. (Perhaps in the future the Apache Arrow JavaScript library could return `Date` instances for date columns? Though this is typically much slower than representing dates as numbers in typed arrays.) We use the **format** option to make these dates readable.

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
