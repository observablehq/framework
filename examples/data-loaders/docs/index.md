---
toc: false
theme: dashboard
---

# Data loader examples

This Observable Framework project is a collection of data loaders, grouped by loader type (e.g. Python, shell script, JavaScript, etc.), that can be quickly explored and reused. 

Each page shows the contents of the data loaders, and includes live example code for accessing data loader outputs.

### Python data loaders

- **`penguin-logistic.csv.py`**: Accesses penguins data from a local file, performs logistic regression for species classification, and returns a CSV.
- **`birth_statistics.png.py`**: Accesses [birth statistics](https://catalog.data.gov/dataset/birth-statistics-a76a6) for Lake County, Indiana from a remote geojson, creates a basic choropleth with matplotlib, and returns a PNG. 
- **`earthquakes.zip.py`**: Accesses [USGS earthquake data](https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson), then returns metadata (in JSON format) and quake attributes (as a CSV) in a Zip archive.  

### JavaScript data loaders

- **`us-electricity.tsv.js`**

### R data loaders

- **`penguin-kmeans.csv.R`**: Accesses penguins data from a local file, performs k-means clustering, and returns a CSV. 
- **`salmon.json.R`**: Scrapes data from the Columbia River DART website, performs data wrangling, and returns a JSON.
- **`penguin-mlr.zip.R`**: Accesses penguins data from a local file, performs multiple linear regression, and returns model estimates and predictions in two separate CSV files added to a Zip archive. 

### Shell script data loaders

- **`penguin.csv.sh`**: Starts a Python script within the shell script to access and wrangle penguins data from a local file.
- **`alt-fuel-stations.parquet.sh`**: Accesses U.S. alternative fuel station data, performs basic data wrangling in SQL with DuckDB, and returns the output as an Apache Parquet file. 
- **`caltrans-districts.json.sh`**: Accesses CalTrans district spatial data from a remote geojson with `curl`.

### Executable data loaders

