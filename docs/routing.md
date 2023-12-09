# Routing

The Observable CLI uses file-based routing. This means each page in your project has a corresponding [Markdown](./markdown) file of the same name. For example, here’s a simple project that only has two pages (`hello.md` and `index.md`) in the source root (`docs`):

```ini
.
├─ docs
│  ├─ hello.md
│  └─ index.md
└─ ...
```

When the site is built, the output root (`dist`) will contain two corresponding static HTML pages (`hello.html` and `index.html`), along with some additional assets needed for the site to work:

```ini
.
├─ dist
│  ├─ _observablehq
│  │  └─ ... # additional assets for serving the site
│  ├─ hello.html
│  └─ index.html
└─ ...
```

When you serve your site, routes map to files this way:

```
/      → dist/index.html → docs/index.md
/hello → dist/hello.html → docs/hello.md
```

Your project should always have a top-level `index.md`; this is the root page of your project, and it’s what people visit by default.

The above examples assume “clean URLs” as supported by most static site servers: `/hello` can also be accessed as `/hello.html`, and `/` can be accessed as `/index` and `/index.html`. (Some static site servers automatically redirect to clean URLs, but try to be consistent when linking to your site.)

## Folders

Pages can live in folders. For example:

```ini
.
├─ docs
│  ├─ missions
|  |  ├─ index.md
|  |  ├─ apollo.md
│  │  └─ gemini.md
│  └─ index.md
└─ ...
```

With this setup, routes are served this way:

```
/                → dist/index.html           → docs/index.md
/missions/       → dist/missions/index.html  → docs/missions/index.md
/missions/apollo → dist/missions/apollo.html → docs/missions/apollo.md
/missions/gemini → dist/missions/gemini.html → docs/missions/gemini.md
```

As a variant of the above structure, you can move the `missions/index.md` up to a `missions.md` in the parent folder:

```ini
.
├─ docs
│  ├─ missions
|  |  ├─ apollo.md
│  │  └─ gemini.md
│  ├─ missions.md
│  └─ index.md
└─ ...
```

With this setup, the following routes are served:

```
/                → dist/index.html           → docs/index.md
/missions        → dist/missions.html        → docs/missions.md
/missions/apollo → dist/missions/apollo.html → docs/missions/apollo.md
/missions/gemini → dist/missions/gemini.html → docs/missions/gemini.md
```

## Imports

If you use a static [`import`](./javascript/imports) (or a dynamic import with a static string literal as the specifier) to import a local JavaScript file, the imported module will be copied to the output root (`dist`) during build, too.

For example, if you have the following source root:

```ini
.
├─ docs
│  ├─ chart.js
│  └─ index.md
└─ ...
```

And `index.md` says:

```js run=false
import {Chart} from "./chart.js";
```

The resulting output root is:

```ini
.
├─ dist
│  ├─ _import
│  │  └─ chart.js
│  ├─ _observablehq
│  │  └─ # additional assets for serving the site
│  └─ index.html
└─ ...
```

The import declaration is automatically rewritten during build to point to `./_import/chart.js` instead of `./chart.js`.

You can use a leading slash to denote paths relative to the source root, such as `/chart.js` instead of `./chart.js`. This allows you to use the same path to import a module from any page, even in nested folders. The Observable CLI always generates relative links so that the generated site can be served under a base path.

## Files

If you use [`FileAttachment`](./javascript/files), attached files live in the source root (`docs`) alongside your Markdown pages. For example, say `index.md` has `FileAttachment("quakes.csv")`:

```ini
.
├─ docs
│  ├─ index.md
│  └─ quakes.csv
└─ ...
```

Any files referenced by `FileAttachment` will automatically be copied to the `_file` folder under the output root (`dist`), here resulting in:

```ini
.
├─ dist
│  ├─ _file
│  │  └─ quakes.csv
│  ├─ _observablehq
│  │  └─ # additional assets for serving the site
│  └─ index.html
└─ ...
```

The `FileAttachment` reference in `index.md` will be automatically rewritten during build so that it loads `_file/quakes.csv` instead of `quakes.csv`. Only the files you reference statically are copied to the output root (`dist`), so nothing extra or unused is included in the built site.

[Imported modules](#imports) can use `FileAttachment`, too. In this case, the path to the file is _relative to the importing module_ in the same fashion as `import`; this is accomplished using [`import.meta.url`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import.meta).

Some additional assets are automatically promoted to file attachments and copied to `_file`. For example, if you have a `<link rel="stylesheet" href="style.css">` declared statically in a Markdown page, the `style.css` file will be copied to `_file`, too. The HTML elements eligible for file attachments are `audio`, `img`, `link`, `picture`, and `video`.

## Data loaders

Files can also be generated at build time by [data loaders](./loaders): arbitrary programs that live alongside Markdown pages and other static files in your source root (`docs`). For example, if you want to generate a `quakes.json` file at build time by fetching and caching data from the USGS, you could write a data loader in a shell script like so:

```ini
.
├─ docs
│  ├─ index.md
│  └─ quakes.json.sh
└─ ...
```

Where `quakes.json.sh` is:

```sh
curl https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson
```

This will produce the following output root:

```ini
.
├─ dist
│  ├─ _file
│  │  └─ quakes.json
│  ├─ _observablehq
│  │  └─ # additional assets for serving the site
│  └─ index.html
└─ ...
```

## Archives

File attachments can be also be pulled from archives. The following archive extensions are supported:

- `.zip` - for the [ZIP](<https://en.wikipedia.org/wiki/ZIP_(file_format)>) archive format
- `.tar` - for [tarballs](<https://en.wikipedia.org/wiki/Tar_(computing)>)
- `.tar.gz` and `.tgz` - for [compressed tarballs](https://en.wikipedia.org/wiki/Gzip)

For example, say you have a `quakes.zip` archive that includes yearly files for observed earthquakes. If you reference `FileAttachment("quakes/2021.csv")` in code, the Observable CLI will pull the `2021.csv` from `quakes.zip`. So this source root:

```ini
.
├─ docs
│  ├─ quakes.zip
│  └─ index.md
└─ ...
```

Becomes this output:

```ini
.
├─ dist
│  ├─ _file
│  │  └─ quakes
│  │     └─ 2021.csv
│  ├─ _observablehq
│  │  └─ # additional assets for serving the site
│  └─ index.html
└─ ...
```
