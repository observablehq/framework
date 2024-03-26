# Python data loaders

Observable Framework supports [data loaders](https://observablehq.com/framework/loaders) written in Python by passing them to the [python3](https://www.python.org/) command. The latter must be available on your `$PATH`. Any library used by your scripts must also be installed.

## CSV

The data loader below reads in the penguins data from a local file, performs [logistic regression](https://en.wikipedia.org/wiki/Logistic_regression), then outputs a single CSV with the original penguin data enriched with species classifications.

Create a file in your project source root with the .csv.py double extension (for example, `docs/data/my-data.csv.py`), then paste the Python code below to get started.

<!-- TODO update with setup information, see: https://github.com/observablehq/framework/tree/main/examples/penguin-classification#reuse-this-example>-->

```js
showCode(FileAttachment("data/penguin-logistic.csv.py"))
```

Access the output of the data loader from the client using [`FileAttachment`](https://observablehq.com/framework/javascript/files):

```js echo
const penguinClassification = FileAttachment("data/penguin-logistic.csv").csv({typed: true});
```

<p class="tip">The file attachment name does not include the <tt>.py</tt> extension. We rely on Framework’s <a href="https://observablehq.com/framework/routing">routing</a> to run the appropriate data loader.

We can now display the dataset with the predictions:

```js echo
Inputs.table(penguinClassification)
```

<!-- End local testing of penguin-logistic.csv.py -->

## PNG

The data loader below accesses [birth data for Lake County, Illinois](https://data-lakecountyil.opendata.arcgis.com/datasets/lakecountyil::birth-statistics/explore) from a local geoJSON file. A simple choropleth of birth rates is created using `matplotlib`, and output as a PNG file.

Create a file in your project source root with the .png.py double extension (for example, `docs/data/my-png.png.py`), then paste the Python code below to get started.

```js
showCode(FileAttachment("data/birth-statistics.png.py"))
```

Access the output of the data loader from the client using [`FileAttachment`](https://observablehq.com/framework/javascript/files):

```js echo
const birthRateMap = FileAttachment("data/birth-statistics.png").image();
```

<p class="tip">The file attachment name does not include the <tt>.py</tt> extension. We rely on Framework’s <a href="https://observablehq.com/framework/routing">routing</a> to run the appropriate data loader.

```js echo
birthRateMap
```

## Zip

The data loader below accesses data on [earthquakes from the USGS](https://www.usgs.gov/programs/earthquake-hazards/earthquakes), then combines metadata (as JSON) and selected earthquake magnitude and location (as a CSV) in a zip archive.

Create a file in your project source root with the .zip.py double extension (for example, `docs/data/my-data.zip.py`), then paste the Python code below to get started.

```js
showCode(FileAttachment("data/earthquakes.zip.py"))
```

Access the output of the data loader from the client using [`FileAttachment`](https://observablehq.com/framework/javascript/files):

```js echo
const quakeMetadata = FileAttachment("data/earthquakes/quakes_metadata.json").json()
```

```js echo
const quakeData = FileAttachment("data/earthquakes/quakes.csv").csv({typed: true})
```

<p class="tip">The file attachment name does not include the <tt>.py</tt> extension. We rely on Framework’s <a href="https://observablehq.com/framework/routing">routing</a> to run the appropriate data loader.

```js echo
quakeData
```

You can alternatively access the zip archive as a whole:

```js echo
const quakeZip = FileAttachment("data/earthquakes.zip").zip()
```

```js echo
quakeZip
```

```js
import {showCode} from "./components/showCode.js";
```
