---
keywords: server-side rendering, ssr, polyglot
---

# Data loaders

**Data loaders** generate static snapshots of data during build. For example, a data loader might query a database and output CSV data, or server-side render a chart and output a PNG image.

Why static snapshots? Performance is critical for dashboards: users don’t like to wait, and dashboards only create value if users look at them. Data loaders practically force your app to be fast because data is precomputed and thus can be served instantly — you don’t need to run queries separately for each user on load. Furthermore, data can be highly optimized (and aggregated and anonymized), minimizing what you send to the client. And since data loaders run only during build, your users don’t need direct access to your data warehouse, making your dashboards more secure and robust.

<div class="tip">Data loaders are optional. You can use <code><a href="https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch">fetch</a></code> or <code><a href="https://developer.mozilla.org/en-US/docs/Web/API/WebSocket">WebSocket</a></code> if you prefer to load data at runtime, or you can store data in static files.</div>
<div class="tip">You can use <a href="./deploying">continuous deployment</a> to rebuild data as often as you like, ensuring that data is always up-to-date.</div>

Data loaders are polyglot: they can be written in any programming language. They can even invoke binary executables such as ffmpeg or DuckDB. For convenience, Framework has built-in support for common languages: JavaScript, TypeScript, Python, and R. Naturally you can use any third-party library or SDK for these languages, too.

A data loader can be as simple as a shell script that invokes [curl](https://curl.se/) to fetch recent earthquakes from the [USGS](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php):

```sh
curl -f https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson
```

Data loaders use [file-based routing](#routing), so assuming this shell script is named `quakes.json.sh`, a `quakes.json` file is then generated at build time. You can access this file from the client using [`FileAttachment`](./files):

```js echo
FileAttachment("quakes.json").json()
```

A data loader can transform data to perfectly suit the needs of a dashboard. The JavaScript data loader below uses [D3](./lib/d3) to output [CSV](./lib/csv) with three columns representing the _magnitude_, _longitude_, and _latitude_ of each earthquake.

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

Assuming the loader above is named `quakes.csv.js`, you can access its output from the client as `quakes.csv`:

```js echo
const quakes = FileAttachment("quakes.csv").csv({typed: true});
```

Now you can display the earthquakes in a map using [Observable Plot](./lib/plot):

```js
const world = await fetch(import.meta.resolve("npm:world-atlas/land-110m.json")).then((response) => response.json());
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

During preview, the preview server automatically runs the data loader the first time its output is needed and [caches](#caching) the result; if you edit the data loader, the preview server will automatically run it again and push the new result to the client.

## Archives

Data loaders can generate multi-file archives such as ZIP files; individual files can then be pulled from archives using `FileAttachment`. This allows a data loader to output multiple (often related) files from the same source data in one go. Framework also supports _implicit_ data loaders, _extractors_, that extract referenced files from static archives. So whether an archive is static or generated dynamically by a data loader, you can use `FileAttachment` to pull files from it.

The following archive extensions are supported:

- `.zip` - for the [ZIP](<https://en.wikipedia.org/wiki/ZIP_(file_format)>) archive format
- `.tar` - for [tarballs](<https://en.wikipedia.org/wiki/Tar_(computing)>)
- `.tar.gz` and `.tgz` - for [compressed tarballs](https://en.wikipedia.org/wiki/Gzip)

Here’s an example of loading an image from `lib/muybridge.zip`:

```js echo
FileAttachment("lib/muybridge/deer.jpeg").image({width: 320, alt: "A deer"})
```

You can do the same with static HTML:

<img src="lib/muybridge/deer.jpeg" width="320" alt="A deer">

```html run=false
<img src="lib/muybridge/deer.jpeg" width="320" alt="A deer">
```

Below is a TypeScript data loader `quakes.zip.ts` that uses [JSZip](https://stuk.github.io/jszip/) to generate a ZIP archive of two files, `metadata.json` and `features.csv`. Note that the data loader is responsible for serializing the `metadata` and `features` objects to appropriate format corresponding to the file extension (`.json` and `.csv`); data loaders are responsible for doing their own serialization.

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

To load data in the browser, use `FileAttachment`:

```js run=false
const metadata = FileAttachment("quakes/metadata.json").json();
const features = FileAttachment("quakes/features.csv").csv({typed: true});
```

The ZIP file itself can be also referenced as a whole — for example if the names of the files are not known in advance — with [`file.zip`](./lib/zip):

```js echo
const zip = FileAttachment("quakes.zip").zip();
const metadata = zip.then((zip) => zip.file("metadata.json").json());
```

Like with any other file, files from generated archives are live in preview (refreshing automatically if the corresponding data loader is edited), and are added to the build only if [statically referenced](./files#static-analysis) by `FileAttachment`.

## Routing

Data loaders live in the source root (typically `src`) alongside your other source files. When a file is referenced from JavaScript via `FileAttachment`, if the file does not exist, Framework will look for a file of the same name with a double extension to see if there is a corresponding data loader. By default, the following second extensions are checked, in order, with the corresponding language and interpreter:

- `.js` - JavaScript (`node`)
- `.ts` - TypeScript (`tsx`)
- `.py` - Python (`python3`)
- `.R` - R (`Rscript`)
- `.rs` - Rust (`rust-script`)
- `.go` - Go (`go run`)
- `.java` — Java (`java`; requires Java 11+ and [single-file programs](https://openjdk.org/jeps/330))
- `.jl` - Julia (`julia`)
- `.php` - PHP (`php`)
- `.sh` - shell script (`sh`)
- `.exe` - arbitrary executable

<div class="tip">The <b>interpreters</b> <a href="./config#interpreters">configuration option</a> can be used to extend the list of supported extensions.</div>

For example, for the file `quakes.csv`, the following data loaders are considered: `quakes.csv.js`, `quakes.csv.ts`, `quakes.csv.py`, _etc._ The first match is used.

## Execution

To use an interpreted data loader (anything other than `.exe`), the corresponding interpreter must be installed and available on your `$PATH`. Any additional modules, packages, libraries, _etc._, must also be installed. Some interpreters are not available on all platforms; for example `sh` is only available on Unix-like systems.

<div class="tip" id="venv">

You can use a virtual environment in Python, such as [venv](https://docs.python.org/3/tutorial/venv.html) or [uv](https://github.com/astral-sh/uv), to install libraries locally to the project. This is useful when working in multiple projects, and when collaborating; you can also track dependencies in a `requirements.txt` file.

To create a virtual environment with venv:

```sh
python3 -m venv .venv
```

Or with uv:

```sh
uv venv
```

To activate the virtual environment on macOS or Linux:

```sh
source .venv/bin/activate
```

Or on Windows:

```sh
.venv\Scripts\activate
```

To install required packages:

```sh
pip install -r requirements.txt
```

You can then run the `observable preview` or `observable build` (or `npm run dev` or `npm run build`) commands as usual; data loaders will run within the virtual environment. Run the `deactivate` command or use Control-D to exit the virtual environment.

</div>

Data loaders are run in the same working directory in which you run the `observable build` or `observable preview` command, which is typically the project root. In Node, you can access the current working directory by calling `process.cwd()`, and the data loader’s source location with [`import.meta.url`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import.meta). To compute the path of a file relative to the data loader source (rather than relative to the current working directory), use [`import.meta.resolve`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import.meta/resolve). For example, a data loader in `src/summary.txt.js` could read the file `src/table.txt` as:

```js run=false
import {readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";

const table = await readFile(fileURLToPath(import.meta.resolve("./table.txt")), "utf-8");
```

Executable (`.exe`) data loaders are run directly and must have the executable bit set. This is typically done via [`chmod`](https://en.wikipedia.org/wiki/Chmod). For example:

```sh
chmod +x src/quakes.csv.exe
```

While a `.exe` data loader may be any binary executable (_e.g.,_ compiled from C), it is often convenient to specify another interpreter using a [shebang](<https://en.wikipedia.org/wiki/Shebang_(Unix)>). For example, to write a data loader in Perl:

```perl
#!/usr/bin/env perl

print("Hello World\n");
```

If multiple requests are made concurrently for the same data loader, the data loader will only run once; each concurrent request will receive the same response.

## Output

Data loaders must output to [standard output](<https://en.wikipedia.org/wiki/Standard_streams#Standard_output_(stdout)>). The first extension (such as `.csv`) does not affect the generated snapshot; the data loader is solely responsible for producing the expected output (such as CSV). If you wish to log additional information from within a data loader, be sure to log to standard error, say by using [`console.warn`](https://developer.mozilla.org/en-US/docs/Web/API/console/warn) or `process.stderr`; otherwise the logs will be included in the output file and sent to the client. If you use `curl` as above, we recommend the `-f` flag (equivalently, the `--fail` option) to make the data loader return an error when the download fails.

## Building

Data loaders generate files at build time that live alongside other [static files](./files) in the `_file` directory of the output root. For example, to generate a `quakes.json` file at build time by fetching and caching data from the USGS, you could write a data loader in a shell script like so:

```ini
.
├─ src
│  ├─ index.md
│  └─ quakes.json.sh
└─ …
```

Where `quakes.json.sh` is:

```sh
curl -f https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson
```

This will produce the following output root:

```ini
.
├─ dist
│  ├─ _file
│  │  └─ quakes.99da78d9.json
│  ├─ _observablehq
│  │  └─ … # additional assets
│  └─ index.html
└─ …
```

As another example, say you have a `quakes.zip` archive that includes yearly files for observed earthquakes. If you reference `FileAttachment("quakes/2021.csv")`, Framework will pull the `2021.csv` from `quakes.zip`. So this source root:

```ini
.
├─ src
│  ├─ index.md
│  └─ quakes.zip
└─ …
```

Becomes this output:

```ini
.
├─ dist
│  ├─ _file
│  │  └─ quakes
│  │     └─ 2021.e5f2eb94.csv
│  ├─ _observablehq
│  │  └─ … # additional assets
│  └─ index.html
└─ …
```

A data loader is only run during build if its corresponding output file is referenced in at least one page. Framework does not scour the source root (typically `src`) for data loaders.

## Caching

When a data loader runs successfully, its output is saved to a cache which lives in `.observablehq/cache` within the source root (typically `src`).

During preview, Framework considers the cache “fresh” if the modification time of the cached output is newer than the modification time of the corresponding data loader source. If you edit a data loader or update its modification time with `touch`, the cache is invalidated; when previewing a page that uses the data loader, the preview server will detect that the data loader was modified and automatically run it, pushing the new data down to the client and re-evaluating any referencing code — no reload required!

During build, Framework ignores modification times and only runs a data loader if its output is not cached. Continuous integration caches typically don’t preserve modification times, so this design makes it easier to control which data loaders to run by selectively populating the cache.

To purge the data loader cache and force all data loaders to run on the next build, delete the entire cache. For example:

```sh
rm -rf src/.observablehq/cache
```

To force a specific data loader to run on the next build instead, delete its corresponding output from the cache. For example, to rebuild `src/quakes.csv`:

```sh
rm -f src/.observablehq/cache/quakes.csv
```

See [Automated deploys: Caching](./deploying#caching) for more on caching during CI.

## Errors

When a data loader fails, it _must_ return a non-zero [exit code](https://en.wikipedia.org/wiki/Exit_status). If a data loader produces a zero exit code, Framework will assume that it was successful and will cache and serve the output to the client. Empty output is not by itself considered an error; however, a warning is displayed in the preview server and build logs.

During preview, data loader errors will be shown in the preview server log, and a 500 HTTP status code will be returned to the client that attempted to load the corresponding file. This typically results in an error such as:

```
RuntimeError: Unable to load file: quakes.csv
```

When any data loader fails, the entire build fails.
