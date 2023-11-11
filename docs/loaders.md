# Data loaders

_(Is this “loaders” or “data loaders”—Or is it “programs” or “dynamic files”, or “data snapshots”… something else? It could be documented as part of “[files](./javascript/files)”)_

Observable Markdown can run an external programme to retrieve and cache a snapshot of some data. Such a programme is called a data loader.

It might, typically, run a query against a database, minimize the result and output it as a csv payload to be retrieved by the `FileAttachment` function (or a local `fetch`).

Observable Markdown has special affordances for a few languages (such as JavaScript, TypeScript, python and R), but a data loader can literally be anything that runs on your computer, from ffmpeg to DuckDB.

For a simple example, let’s say we want to generate a list of recent earthquakes, a resource that will ultimately live as a file under the /data/earthquakes.csv URL on the generated site. We can write a programme in JavaScript that fetches the most recent data from the USGS API, and outputs a csv to STDOUT, with a subset of the properties in the original file:

```js no-run show
console.log("magnitude,longitude,latitude");
fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson")
  .then((response) => response.json())
  .then((collection) => {
    console.warn(collection.features);
    collection.features.forEach((feature) => {
      console.log(`${feature.properties.mag},${feature.geometry.coordinates.join(",")}`);
    });
  });
```

We save this script as docs/data/earthquakes.csv.js, and load a page with the following code:

```js show
const quakes = FileAttachment("data/earthquakes.csv").csv({typed: true})
```

and the data appears, ready to create a map or a table:

```js
Inputs.table(quakes, {width: 420})
```

## Caching

The data loader is run once and — if successful — its output is saved to a cache file, and then used both for the dev server and the build script. When you edit any data loader, it transparently runs again as soon as the resource is needed. 

The only time when you’ll want to purge the cache is when you want to ensure that the result is fresh with respect to the external data source. Typically, if you generate a dashboard daily with the build command, run the following commands in order:

```sh
rm -rf docs/.observablehq/cache
yarn build
```

## Building

A resource that depends on a data loader is built if and only if it is referenced in at least one page of the project (as a FileAttachment or a local fetch). In other words, Observable Markdown does _not_ scour the docs/ directory for data loaders; only the resources that are actually consumed by a page are built.

## Logging & error handling

Data loader runs output logs at the start of their execution, and at the end, with a status (success or error), execution time, and in case of success the size (in bytes) of the generated resource.

When an error happens during the execution of a data loader, it is shown in that log. The calling page on the development server shows an error `RuntimeError: Unable to load file: data/earthquakes.csv`. If the data loader error happens during the build script, the build stops (and displays the error).

To _guarantee_ that a generated resource is complete, the data loader must exit with a non-zero return code in case of an error. This always happens if there is a Syntax Error, but for some scripts you’ll want to assert that all the requirements are met.

A data loader does not error if the output is empty (it might be a legitimate output in some cases), but displays a warning in the logs.

## API

A data loader can be a binary programme or a script. When a resource is requested (via FileAttachment or a local fetch) for /path/to/resource.extension, and if a corresponding file does not already exist in the project, Observable Markdown looks for files such as /path/to/resource.extension.{language} for all supported languages, and finally /path/to/resource.extension.exe, in that order.

If any of these files exists, it is called either as a script with the associated interpreter for any of the supported languages, or as a binary (or `#!` script) for .exe files.

The following interpreters (or more informally, languages) are supported:

* .js - node (JavaScript)
* .ts - tsx (TypeScript)
* .py - python3
* .R - Rscript

If you use .py or .R, you need to make sure that the corresponding interpreter is installed and accessible from Observable Markdown. Any modules, packages, etc., must also be installed before you can use them (errors will appear in the logs).

**.exe** data loaders are run directly. They can be binary programmes (_e.g.,_ compiled from C language), but most likely will follow the “shebang” convention, written as scripts where the first line points to the interpreter:

```sh
#!/usr/bin/env julia

println("hello world")
```

This allows data loaders to be written with absolutely _any_ language that is installed on the machine.

.exe files must be executable to run as data loaders. Typically this is done in the Terminal with the following command:

```sh
chmod +x docs/data.csv.exe
```

The script or programme is expected to write the resource’s contents to [STDOUT](https://en.wikipedia.org/wiki/Standard_streams#Standard_output_(stdout)), and exit with a return code of 0.

## Debugging

Besides the logs, you can debug a data loader by calling it directly:

```sh
❯ ./docs/julia.txt.exe
hello world
```
