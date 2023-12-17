# Data loaders

**Data loaders** generate files — typically static snapshots of data — at build time. For example, a data loader might query a database and output a CSV file, or server-side render a chart and output a PNG image.

Why generate data at build time? Conventional dashboards are often slow or even unreliable because database queries are executed for each viewer on load. By preparing static data snapshots ahead of time during build, dashboards load instantly with no external dependency on your database. You can also optimize data snapshots for what your dashboard needs, further improving performance and offering more control over what information is shared with viewers.

Data loaders can be written in any programming language. They can even invoke binary executables such as ffmpeg or DuckDB! For convenience, the Observable CLI has built-in support for common languages: JavaScript, TypeScript, Python, and R. Naturally you can use any third-party library or SDK for these languages, too.

Let’s take a look at a simple data loader written in JavaScript. It [fetches](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) a GeoJSON feature collection of recent earthquakes from the [USGS API](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php). The data loader then uses [d3-dsv](https://d3js.org/d3-dsv) to output CSV to standard output with three columns representing the _magnitude_, _longitude_, and _latitude_ of each earthquake.

```js run=false echo
import {csvFormat} from "d3-dsv";

// Fetch GeoJSON from the USGS.
const response = await fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson");
if (!response.ok) throw new Error(`fetch failed: ${response.status}`);
const collection = await response.json();

// Convert to an array of objects.
const features = collection.features.map((f) => ({
  magnitude: f.properties.mag,
  longitude: f.geometry.coordinates[0],
  latitude: f.geometry.coordinates[1]
}));

// Output CSV.
process.stdout.write(csvFormat(features));
```

The Observable CLI uses [file-based routing](./routing); by naming the data loader `quakes.csv.js`, we can then access its output in client-side JavaScript as a [`FileAttachment`](./javascript/files) named `quakes.csv`.

```js echo
const quakes = FileAttachment("quakes.csv").csv({typed: true});
```

Now we can display the earthquakes in a map using [Observable Plot](./lib/plot):

```js
const world = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@1/world/110m.json").then((response) => response.json());
const land = topojson.feature(world, world.objects.land);
```

```js echo
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

During preview, the CLI automatically runs the data loader the first time its output is needed and [caches](#caching) the result; if you edit the data loader, the CLI will automatically run it again and push the new result to the client.

Here are some more details on data loaders.

## Archives

Data loaders can generate multi-file archives, either using the [ZIP](<https://en.wikipedia.org/wiki/ZIP_(file_format)>) or [tar](<https://en.wikipedia.org/wiki/Tar_(computing)>) format; individual files can then be pulled from archives using `FileAttachment`. This allows a data loader to output multiple related files from the same source data in one go.

For example, here is a TypeScript data loader `quakes.zip.ts` that uses [JSZip](https://stuk.github.io/jszip/) to generate a ZIP archive of two files, `metadata.json` and `features.csv`:

```js run=false
import {csvFormat} from "d3-dsv";
import JSZip from "jszip";

// Fetch GeoJSON from the USGS.
const response = await fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson");
if (!response.ok) throw new Error(`fetch failed: ${response.status}`);
const collection = await response.json();

// Convert to an array of objects.
const features = collection.features.map((f) => ({
  magnitude: f.properties.mag,
  longitude: f.geometry.coordinates[0],
  latitude: f.geometry.coordinates[1]
}));

// Output a ZIP archive to stdout.
const zip = new JSZip();
zip.file("metadata.json", JSON.stringify(collection.metadata, null, 2));
zip.file("features.csv", csvFormat(features));
zip.generateNodeStream().pipe(process.stdout);
```

Note how the last part serializes the `metadata` and `features` objects to a readable format corresponding to the file extension (`.json` and `.csv`).

To load data in the browser, use `FileAttachment`:

```js run=false
const metadata = FileAttachment("quakes/metadata.json").json();
const features = FileAttachment("quakes/features.csv").csv({typed: true});
```

The ZIP file itself can be also referenced as a whole — for example if the names of the files are not known in advance — with [`FileAttachment.zip`](../javascript/files#zip):

```js echo
const zip = FileAttachment("quakes.zip").zip();
const metadata = zip.then((zip) => zip.file("metadata.json").json());
```

The following archive extensions are supported:

- `.zip` - for the [ZIP](<https://en.wikipedia.org/wiki/ZIP_(file_format)>) archive format
- `.tar` - for [tarballs](<https://en.wikipedia.org/wiki/Tar_(computing)>)
- `.tar.gz` and `.tgz` - for [compressed tarballs](https://en.wikipedia.org/wiki/Gzip)

Like with any other file, these files from generated archives are live in preview (they will refresh automatically if the corresponding data loader script is edited), and are added to the build if and only if referenced by `FileAttachment` (see [Files: ZIP](./javascript/files#zip-archives)).

## Routing

Data loaders live in the source root (typically `docs`) alongside your other source files. When a file is referenced from JavaScript via `FileAttachment`, if the file does not exist, the CLI will look for a file of the same name with a double extension to see if there is a corresponding data loader. The following second extensions are checked, in order, with the corresponding language and interpreter:

- `.js` - JavaScript (`node`)
- `.ts` - TypeScript (`tsx`)
- `.py` - Python (`python3`)
- `.R` - R (`Rscript`)
- `.sh` - shell script (`sh`)
- `.exe` - arbitrary executable

For example, for the file `quakes.csv`, the following data loaders are considered:

- `quakes.csv.js`
- `quakes.csv.ts`
- `quakes.csv.py`
- `quakes.csv.R`
- `quakes.csv.sh`
- `quakes.csv.exe`

If you use `.py` or `.R`, the corresponding interpreter (`python3` or `Rscript`, respectively) must be installed and available on your `$PATH`. Any additional modules, packages, libraries, _etc._, must also be installed before you can use them.

Whereas `.js`, `.ts`, `.py`, `.R`, and `.sh` data loaders are run via interpreters, `.exe` data loaders are run directly and must have the executable bit set. This is typically done via [`chmod`](https://en.wikipedia.org/wiki/Chmod). For example:

```sh
chmod +x docs/quakes.csv.exe
```

While a `.exe` data loader may be any binary executable (_e.g.,_ compiled from C), it is often convenient to specify another interpreter using a [shebang](<https://en.wikipedia.org/wiki/Shebang_(Unix)>). For example, to write a data loader in Julia:

```julia
#!/usr/bin/env julia

println("hello world")
```

If multiple requests are made concurrently for the same data loader, the data loader will only run once; each concurrent request will receive the same response.

## Output

Data loaders must output to [standard output](<https://en.wikipedia.org/wiki/Standard_streams#Standard_output_(stdout)>). The first extension (such as `.csv`) does not affect the generated snapshot; the data loader is solely responsible for producing the expected output (such as CSV). If you wish to log additional information from within a data loader, be sure to log to stderr, say by using [`console.warn`](https://developer.mozilla.org/en-US/docs/Web/API/console/warn); otherwise the logs will be included in the output file and sent to the client.

## Caching

When a data loader runs successfully, its output is saved to the cache within the source root, typically `docs/.observablehq/cache`.

The Observable CLI considers the cache “fresh” if the modification time of the cached output is newer than the modification time of the corresponding data loader. So, if you edit a data loader (or update its modification time with `touch`), the cache is invalidated. When previewing a page that uses the data loader, the preview server will detect that the data loader was edited and automatically run it, pushing the new data down to the client and re-evaluating any referencing code — no reload required!

To purge the data loader cache, delete the cache. For example:

```sh
rm -rf docs/.observablehq/cache
```

## Building

A data loader is run during build if and only if its corresponding output file is referenced in at least one page. The CLI does not scour the source root (`docs`) for data loaders.

The data loader cache is respected during build. This allows you to bypass some or all data loaders during build, if the previously built data is still fresh. To force the CLI to use the data loader cache, ensure that the modification times of the cache are greater than those of the data loaders, say by using `touch` on all files in the cache.

```sh
find docs/.observablehq/cache -type f -exec touch {} +
```

## Errors

When a data loader fails, it _must_ return a non-zero [exit code](https://en.wikipedia.org/wiki/Exit_status). If a data loader produces a zero exit code, the CLI will assume that it was successful and will cache and serve the output to the client. Empty output is not by itself considered an error; however, a warning is displayed in the preview server and build logs.

During preview, data loader errors will be shown in the preview server log, and a 500 HTTP status code will be returned to the client that attempted to load the corresponding file. This typically results in an error such as:

```
RuntimeError: Unable to load file: quakes.csv
```

When any data loader fails, the entire build fails.
