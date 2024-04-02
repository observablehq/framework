# Data loaders

**Data loaders** generate files — typically static snapshots of data — at build time. For example, a data loader might query a database and output a CSV file, or server-side render a chart and output a PNG image.

Why generate data at build time? Conventional dashboards are often slow or even unreliable because database queries are executed for each viewer on load. By preparing static data snapshots ahead of time during build, dashboards load instantly with no external dependency on your database. You can also optimize data snapshots for what your dashboard needs, further improving performance and offering more control over what information is shared with viewers.

Data loaders can be written in any programming language. They can even invoke binary executables such as ffmpeg or DuckDB! For convenience, Observable Framework has built-in support for common languages: JavaScript, TypeScript, Python, and R. Naturally you can use any third-party library or SDK for these languages, too.

A data loader can be as simple as a shell script that invokes [curl](https://curl.se/) to fetch recent earthquakes from the [USGS](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php):

```sh
curl https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson
```

Observable Framework uses [file-based routing](./routing), so assuming this shell script is named `quakes.json.sh`, a `quakes.json` file is then generated at build time. You can access this file from the client using [`FileAttachment`](./data#files):

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
const world = await fetch(import.meta.resolve("npm:world-atlas@1/world/110m.json")).then((response) => response.json());
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

The ZIP file itself can be also referenced as a whole — for example if the names of the files are not known in advance — with [`FileAttachment.zip`](./lib/zip):

```js echo
const zip = FileAttachment("quakes.zip").zip();
const metadata = zip.then((zip) => zip.file("metadata.json").json());
```

The following archive extensions are supported:

- `.zip` - for the [ZIP](<https://en.wikipedia.org/wiki/ZIP_(file_format)>) archive format
- `.tar` - for [tarballs](<https://en.wikipedia.org/wiki/Tar_(computing)>)
- `.tar.gz` and `.tgz` - for [compressed tarballs](https://en.wikipedia.org/wiki/Gzip)

Like with any other file, these files from generated archives are live in preview (they will refresh automatically if the corresponding data loader script is edited), and are added to the build if and only if referenced by `FileAttachment` (see [Files: ZIP](./lib/zip)).

## Routing

Data loaders live in the source root (typically `docs`) alongside your other source files. When a file is referenced from JavaScript via `FileAttachment`, if the file does not exist, Observable Framework will look for a file of the same name with a double extension to see if there is a corresponding data loader. By default, the following second extensions are checked, in order, with the corresponding language and interpreter:

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

For example, for the file `quakes.csv`, the following data loaders are considered: `quakes.csv.js`, `quakes.csv.ts`, `quakes.csv.py`, _etc._ The first match is used.

<div class="tip">The <b>interpreters</b> <a href="./config#interpreters">configuration option</a> can be used to extend the list of supported extensions.</div>

To use an interpreted data loader (anything other than `.exe`), the corresponding interpreter must be installed and available on your `$PATH`. Any additional modules, packages, libraries, _etc._, must also be installed. Some interpreters are not available on all platforms; for example `sh` is only available on Unix-like systems.

<div class="tip">

You can use a virtual environment in Python, such as [uv](https://github.com/astral-sh/uv), to install libraries locally to the project. This is useful when working in multiple projects, and when collaborating; you can also track dependencies in a `requirements.txt` file. To create a virtual environment with uv, run:

```sh
uv venv # Create a virtual environment at .venv.
```

To activate the virtual environment on macOS or Linux:

```sh
source .venv/bin/activate
```

Or on Windows:

```sh
.venv\Scripts\activate
```

You can then run the `observable preview` or `observable build` commands as usual; data loaders will run within the virtual environment. Run the `deactivate` command to exit the virtual environment.

</div>

Data loaders are run in the same working directory in which you run the `observable build` or `observable preview` command, which is typically the project root. In Node, you can access the current working directory by calling `process.cwd()`, and the data loader’s source location with [`import.meta.url`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import.meta). To compute the path of a file relative to the data loader source (rather than relative to the current working directory), use [`import.meta.resolve`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import.meta/resolve). For example, a data loader in `docs/summary.txt.js` could read the file `docs/table.txt` as:

```js run=false
import {readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";

const table = await readFile(fileURLToPath(import.meta.resolve("./table.txt")), "utf-8");
```

Executable (`.exe`) data loaders are run directly and must have the executable bit set. This is typically done via [`chmod`](https://en.wikipedia.org/wiki/Chmod). For example:

```sh
chmod +x docs/quakes.csv.exe
```

While a `.exe` data loader may be any binary executable (_e.g.,_ compiled from C), it is often convenient to specify another interpreter using a [shebang](<https://en.wikipedia.org/wiki/Shebang_(Unix)>). For example, to write a data loader in Perl:

```perl
#!/usr/bin/env perl

print("Hello World\n");
```

If multiple requests are made concurrently for the same data loader, the data loader will only run once; each concurrent request will receive the same response.

## Output

Data loaders must output to [standard output](<https://en.wikipedia.org/wiki/Standard_streams#Standard_output_(stdout)>). The first extension (such as `.csv`) does not affect the generated snapshot; the data loader is solely responsible for producing the expected output (such as CSV). If you wish to log additional information from within a data loader, be sure to log to stderr, say by using [`console.warn`](https://developer.mozilla.org/en-US/docs/Web/API/console/warn); otherwise the logs will be included in the output file and sent to the client.

## Caching

When a data loader runs successfully, its output is saved to the cache within the source root, typically `docs/.observablehq/cache`.

Observable Framework considers the cache “fresh” if the modification time of the cached output is newer than the modification time of the corresponding data loader. So, if you edit a data loader (or update its modification time with `touch`), the cache is invalidated. When previewing a page that uses the data loader, the preview server will detect that the data loader was edited and automatically run it, pushing the new data down to the client and re-evaluating any referencing code — no reload required!

To purge the data loader cache, delete the cache. For example:

```sh
rm -rf docs/.observablehq/cache
```

## Building

A data loader is run during build if and only if its corresponding output file is referenced in at least one page. Observable Framework does not scour the source root (`docs`) for data loaders.

The data loader cache is respected during build. This allows you to bypass some or all data loaders during build, if the previously built data is still fresh. To force Observable Framework to use the data loader cache, ensure that the modification times of the cache are greater than those of the data loaders, say by using `touch` on all files in the cache.

```sh
find docs/.observablehq/cache -type f -exec touch {} +
```

## Errors

When a data loader fails, it _must_ return a non-zero [exit code](https://en.wikipedia.org/wiki/Exit_status). If a data loader produces a zero exit code, Observable Framework will assume that it was successful and will cache and serve the output to the client. Empty output is not by itself considered an error; however, a warning is displayed in the preview server and build logs.

During preview, data loader errors will be shown in the preview server log, and a 500 HTTP status code will be returned to the client that attempted to load the corresponding file. This typically results in an error such as:

```
RuntimeError: Unable to load file: quakes.csv
```

When any data loader fails, the entire build fails.
