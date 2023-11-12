# Data loaders

**Data loaders** generate files — typically static snapshots of data — at build time. For example, a data loader might query a database and output a CSV or Parquet file, or server-side render a chart and output a PNG image.

Why generate data at build time? Conventional dashboards are often slow or unreliable because database queries are executed for each viewer on load. This conventional approach may also allow viewers to run arbitrary queries, increasing security risk by giving viewers more access than necessary. Data loaders, in contrast, encourage you to prepare static data snapshots at build time. This results in dashboards that load _instantly_ and without giving viewers more access than necessary.

Data loaders can be written in any programming language. They can even invoke binary executables such as ffmpeg or DuckDB! For convenience, the Observable CLI has built-in support for common languages: JavaScript, TypeScript, Python, and R.

For example, say you want a list of recent earthquakes as an `earthquakes.csv` file. Create a corresponding JavaScript data loader, `earthquakes.csv.js`, which queries the [USGS API](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php) and outputs CSV to stdout:

```js no-run show
process.stdout.write("magnitude,longitude,latitude\n");
const response = await fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson");
const collection = await response.json();
for (const feature of collection.features) {
  process.stdout.write(`${feature.properties.mag},${feature.geometry.coordinates.join(",")}`);
}
```

Next, load `earthquakes.csv` as a normal [file](./javascript/files):

```js show
const quakes = FileAttachment("earthquakes.csv").csv({typed: true});
```

And that’s it! The CLI automatically runs the data loader. (More details below.)

Now we can display the earthquakes in a map:

```js
const world = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@1/world/110m.json").then((response) => response.json());
const land = topojson.feature(world, world.objects.land);
```

```js show
Plot.plot({
  projection: {
    type: "orthographic",
    rotate: [110, -30]
  },
  marks: [
    Plot.graticule(),
    Plot.sphere(),
    Plot.geo(land, {stroke: "var(--theme-foreground-faint)"}),
    Plot.dot(quakes, {x: "longitude", y: "latitude", r: "magnitude", stroke: "#f43f5e"})
  ]
})
```

Here are some more details on data loaders.

## Routing

When a file is referenced, either via [`FileAttachment`](./javascript/files) or [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API), if the file does not exist, the CLI will look for a file of the same name with a double extension to see if there is a corresponding data loader. The following second extensions are checked, in order, with the corresponding language and interpreter:

* `.js` - JavaScript (`node`)
* `.ts` - TypeScript (`tsx`)
* `.py` - Python (`python3`)
* `.R` - R (`Rscript`)
* `.sh` - shell script (`sh`)
* `.exe` - arbitrary executable

For example, for the file `earthquakes.csv`, the following data loaders are considered:

* `earthquakes.csv.js`
* `earthquakes.csv.ts`
* `earthquakes.csv.py`
* `earthquakes.csv.R`
* `earthquakes.csv.sh`
* `earthquakes.csv.exe`

If you use `.py` or `.R`, the corresponding interpreter (`python3` or `Rscript`, respectively) must be installed and available on your `$PATH`. Any additional modules, packages, libraries, _etc._, must also be installed before you can use them.

Whereas `.js`, `.ts`, `.py`, `.R`, and `.sh` data loaders are run via interpreters, `.exe` data loaders are run directly and must have the executable bit set. This is typically done via [`chmod`](https://en.wikipedia.org/wiki/Chmod). For example:

```sh
chmod +x docs/earthquakes.csv.exe
```

While a `.exe` data loader may be any binary executable (_e.g.,_ compiled from C), it is often convenient to specify another interpreter using a [shebang](https://en.wikipedia.org/wiki/Shebang_(Unix)). For example, to write a data loader in Julia:

```julia
#!/usr/bin/env julia

println("hello world")
```

If multiple requests are made concurrently for the same data loader, the data loader will only run once; each concurrent request will receive the same response.

## Output

Data loaders must output to [stdout](https://en.wikipedia.org/wiki/Standard_streams#Standard_output_(stdout)). The first extension (such as `.csv`) is not considered by the CLI; the data loader is solely responsible for producing the expected output (such as CSV). If you wish to log additional information from within a data loader, be sure to log to stderr, say by using [`console.warn`](https://developer.mozilla.org/en-US/docs/Web/API/console/warn); otherwise the logs will be included in the output file and sent to the client.

## Caching

When a data loader runs successfully, its output is saved to the cache within the source root, typically `docs/.observablehq/cache`.

The Observable CLI considers the cache “fresh” if the modification time of the cached output is newer than the modification time of the corresponding data loader. So, if you edit a data loader (or update its modification time with `touch`), the cache is invalidated. When previewing a page that uses the data loader, the preview server will detect that the data loader was edited and automatically run it, pushing the new data down to the client and re-evaluating any referencing code — no reload required!

To purge the data loader cache, delete the cache. For example:

```sh
rm -rf docs/.observablehq/cache
```

## Building

A data loader is run during build if and only if its corresponding output file is referenced in at least one page. The CLI does _not_ scour the source directory (typically `docs`) for data loaders.

The data loader cache is respected during build. This allows you to bypass some or all data loaders during build, if the previously built data is still fresh. To force the CLI to use the data loader cache, ensure that the modification times of the cache are greater than those of the data loaders, say by using `touch` on all files in the cache.

```sh
find docs/.observablehq/cache -type f -exec touch {} +
```

## Errors

When a data loader fails, it _must_ return a non-zero [exit code](https://en.wikipedia.org/wiki/Exit_status). If a data loader produces a zero exit code, the CLI will assume that it was successful and will cache and serve the output to the client. Empty output is not by itself considered an error; however, a warning is displayed in the preview server and build logs.

During preview, data loader errors will be shown in the preview server log, and a 500 HTTP status code will be returned to the client that attempted to load the corresponding file. This typically results in an error such as:

```
RuntimeError: Unable to load file: earthquakes.csv
```

When any data loader fails, the entire build fails.
