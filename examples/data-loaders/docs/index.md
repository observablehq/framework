---
toc: false
theme: dashboard
---

# Observable Framework data loader examples

This project is a collection of data loaders, grouped by loader type (e.g. Python, shell script, JavaScript, etc.), that can be quickly explored and reused.

Each page shows the contents of the data loaders, and includes live example code for accessing data loader outputs.

Or, just [view the code](https://github.com/observablehq/framework/tree/main/examples/data-loaders/docs/data)!

### Python data loaders

- **[`penguin-logistic.csv.py`](./python#csv)**: Accesses penguins data from a local file, performs logistic regression for species classification, and returns a CSV.
- **[`birth_statistics.png.py`](./python#png)**: Accesses birth statistics for Lake County, Indiana from a geojson, creates a basic choropleth with matplotlib, and returns a PNG.
- **[`earthquakes.zip.py`](./python#zip)**: Accesses USGS earthquake data, then returns metadata (in JSON format) and quake attributes (as a CSV) in a Zip archive.

### JavaScript data loaders

- **[`us-electricity.tsv.js`](./js#tsv)**: Accesses U.S. electricity data, performs basic wrangling, then returns a TSV file.
- **[`magic.json.js`](./js#json)**: Accesses Magic card data from an API, perform basic wrangling, then returns a JSON.

### R data loaders

- **[`penguin-kmeans.csv.R`](./r#csv)**: Accesses penguins data from a local file, performs k-means clustering, and returns a CSV.
- **[`tolstoy.json.R`](./r#json)**: Wrangles text of _War and Peace_, finds the most common words by chapter, then returns a JSON.
- **[`penguin-mlr.zip.R`](./r#zip)**: Accesses penguins data from a local file, performs multiple linear regression, and returns model estimates and predictions in two separate CSV files added to a Zip archive.

### Shell script data loaders

- **[`penguin.csv.sh`](./shell#csv)**: Starts a Python script within a shell script to access and wrangle penguins data from a local file, then returns a CSV.
- **[`alt-fuel-stations.parquet.sh`](./shell#parquet)**: Accesses U.S. alternative fuel station data, performs basic data wrangling in SQL with DuckDB, and returns an Apache Parquet file.
- **[`caltrans-districts.json.sh`](./shell#json)**: Accesses CalTrans district spatial data from a remote geojson with `curl`, and returns a JSON.

### Executable data loaders

- **[`diamonds.jpeg.exe`](./exe#jpeg)**: Specifies R interpreter with a shebang, then creates a scatterplot in ggplot2 and returns the chart as a JPEG.
- **[`raven.txt.exe`](./exe#txt)**: Specifies Julia interpreter with a shebang, then accesses _The Raven_ text and returns a single paragraph from the poem as text.
