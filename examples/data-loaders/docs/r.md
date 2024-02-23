# R data loader examples

Observable Framework supports [data loaders](../loaders) written in R, by passing them to the [Rscript](https://www.r-project.org/) command. The latter must be available on your `$PATH`. Any library used by your scripts must also be installed.

## CSV

The data loader below reads in the [penguins data](https://journal.r-project.org/articles/RJ-2022-020/) from a local file, performs [k-means clustering](https://en.wikipedia.org/wiki/K-means_clustering) based on culmen (bill) length and depth, then outputs a CSV file the original penguins data enriched with cluster assignments.

Create a file in your project source root with the .csv.R double extension (for example, `docs/data/my-data.csv.R`), then paste the R code below to get started.

```js
showCode(FileAttachment("data/penguin-kmeans.csv.R"))
```

Access the output of the data loader from the client using [`FileAttachment`](https://observablehq.com/framework/javascript/files):

```js echo
const penguinKmeans = FileAttachment("data/penguin-kmeans.csv").csv({typed: true});
```

<p class="tip">The file attachment name does not include the <tt>.R</tt> extension. We rely on Framework’s <a href="https://observablehq.com/framework/routing">routing</a> to run the appropriate data loader.

We can now display the dataset with the assigned clusters:

```js
Inputs.table(penguinKmeans)
```

## JSON

The data loader below accesses the text of _War and Peace_ from the [Gutenberg Project](https://www.gutenberg.org/ebooks/2600), finds the most common words by chapter, and returns a JSON.

Create a file in your project source root with the .json.R double extension (for example, `docs/data/my-data.json.R`), then paste the R code below to get started.

```js
showCode(FileAttachment("data/tolstoy.json.R"))
```

Access the output of the data loader from the client using [`FileAttachment`](https://observablehq.com/framework/javascript/files):

```js echo
const text = FileAttachment("data/tolstoy.json").json()
```

<p class="tip">The file attachment name does not include the <tt>.R</tt> extension. We rely on Framework’s <a href="https://observablehq.com/framework/routing">routing</a> to run the appropriate data loader.

```js echo
text
```

## ZIP

The data loader below reads in the [penguins data](https://journal.r-project.org/articles/RJ-2022-020/) from a local file, performs multiple linear regression, then outputs multiple files (with model estimates and predictions) as a ZIP archive.

Create a file in your project source root with the .zip.R double extension (for example, `docs/data/my-data.zip.R`), then paste the R code below to get started.

```js
showCode(FileAttachment("data/penguin-mlr.zip.R"))
```

The `system` function invokes the system command `"zip - -r ."`, where:

- `zip` is the command for zipping files
- `-` means the archive is output to standard output (required for data loaders)
- `-r`, the recursive option, means all files are added to the zip archive
- `.` compresses the current working directory

Access the output of the data loader from the client using [`FileAttachment`](https://observablehq.com/framework/javascript/files):

```js echo
const modelZip = FileAttachment("data/penguin-mlr.zip").zip();
```

<p class="tip">The file attachment name does not include the <tt>.R</tt> extension. We rely on Framework’s <a href="https://observablehq.com/framework/routing">routing</a> to run the appropriate data loader.

You can then access individual files from the ZIP archive:

```js echo
const modelEstimates = modelZip.file("estimates.csv").csv({typed: true});
```

```js echo
modelEstimates
```

Alternatively, access individual files from the ZIP archive straightaway:

```js echo
const modelPredictions = FileAttachment("data/penguin-mlr/predictions.csv").csv({typed: true})
```

```js echo
modelPredictions
```

```js
import {showCode} from "./components/showCode.js";
```
