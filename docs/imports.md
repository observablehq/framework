# Imports

You can load a library using an [`import` statement](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import). For example, to load [canvas-confetti](https://github.com/catdad/canvas-confetti) from npm:

```js echo
import confetti from "npm:canvas-confetti";
```

The code above imports the default export and is equivalent to:

```js run=false
import {default as confetti} from "npm:canvas-confetti";
```

Depending on the package, you may want to import specific named exports, or to import everything as a namespace. For example:

```js run=false
import {rollup} from "npm:d3-array"; // a single named import
import * as d3 from "npm:d3"; // import everything as a namespace
```

Imported symbols can be referenced in any code block or inline expression — not only in the code block that declares the import.

```js echo
Inputs.button("Throw confetti! 🎉", {reduce: () => confetti()})
```


<div class="tip">While imports can live in code blocks anywhere on the page, by convention imports are placed at the top of pages for readability.</div>

Framework provides a variety of ways to import. When you reference `d3`, `Inputs`, `Plot` or some other built-in, you’re [implicitly importing](#implicit-imports) from npm. In addition, you can import modules explicitly from:

- [npm](#npm-imports),
- [`node_modules`](#node-imports),
- [local paths](#local-imports), or
- [remote URLs](#remote-imports).

With the exception of remote imports, imported modules are bundled with your project, improving performance, security, and stability. In some cases, such as stylesheets and WebAssembly modules, you may need to specify additional files to download via [`import.meta.resolve`](#dynamic-imports).

## npm imports

You can import a package from the [npm registry](https://www.npmjs.com/) using the `npm:` protocol. When you import using `npm:`, Framework automatically downloads and self-hosts the package via the [jsDelivr CDN](https://www.jsdelivr.com/esm). Unlike [imports from `node_modules`](#node-imports), you don’t have to install `npm:` imports — just import, and the cloud shall provide. 😌

By default, npm imports resolve to the latest version of the given package. Imported versions are resolved on build or during preview and cached in your [npm cache](#self-hosting-of-npm-imports). To load an earlier or specific version of a package, add a [semver range](https://docs.npmjs.com/about-semantic-versioning). For example, to load major version 1 of canvas-confetti:

```js run=false
import confetti from "npm:canvas-confetti@1";
```

To import a specific [entry point](https://nodejs.org/api/packages.html#package-entry-points), append a slash `/` and the desired entry point path to the package name. For example, to load mime’s `lite` entry point:

```js run=false
import mime from "npm:mime/lite";
```

Similarly, to import the file `dist/confetti.module.mjs` from canvas-confetti:

```js run=false
import confetti from "npm:canvas-confetti/dist/confetti.module.mjs";
```

If you do not specify an entry point, the default entry point is determined by the imported package’s `package.json`, typically by the [`exports` field](https://nodejs.org/api/packages.html#exports); see [jsDelivr’s GitHub](https://github.com/jsdelivr/jsdelivr/issues/18263) for details.

<div class="tip">If you’re having difficulty importing, it may help to browse the package and see what files are available, and what’s exported in the <code>package.json</code>. You can browse the contents of a published module via jsDelivr; for example, see <a href="https://cdn.jsdelivr.net/npm/canvas-confetti/">https://cdn.jsdelivr.net/npm/canvas-confetti/</a>.</div>

### Self-hosting of npm imports

Framework downloads `npm:` imports from jsDelivr during preview and build. This improves performance, security, and stability of your built site by removing runtime dependencies on external sites.

Downloads from npm are cached in `.observablehq/cache/_npm` within your [source root](./config#root) (typically `src`). An imported module is downloaded from jsDelivr only if it is not already in the cache. You can clear the cache and restart the server to re-fetch the latest versions of libraries from npm.

Self-hosting of `npm:` imports applies to transitive static and [dynamic imports](#dynamic-imports). In addition to downloading modules, Framework downloads supporting files as needed for [recommended libraries](#implicit-imports) and [`import.meta.resolve`](#import-resolutions). For example, [DuckDB](./lib/duckdb) needs WebAssembly modules, and [KaTeX](./lib/tex) needs a stylesheet and fonts. For dynamic imports and `import.meta.resolve`, Framework is only able to self-host import specifiers that are static string literals.

## Node imports <a href="https://github.com/observablehq/framework/releases/tag/v1.6.0" class="observablehq-version-badge" data-version="^1.6.0" title="Added in 1.6.0"></a>

You can import from `node_modules`. This is useful for managing dependencies with a package manager such as npm or Yarn, for importing private packages from the npm registry, or for importing from a different package registry such as GitHub.

After installing a package (say with `npm install` or `yarn add`), import it using a bare specifier such as `d3` or `lodash`. For example, to import canvas-confetti:

```js run=false
import confetti from "canvas-confetti";
```

Or to import Apache Arrow:

```js run=false
import * as Arrow from "apache-arrow";
```

<div class="note">Not all Node packages are usable in the browser; Node imports are only supported for modules that do not rely on Node-specific APIs and that can be converted to ES modules via <a href="https://esbuild.github.io/">esbuild</a>. If you have difficulty importing a module, please ask for help by <a href="https://github.com/observablehq/framework/discussions">opening a discussion</a>.</div>

You can also import specific [entry points](https://nodejs.org/api/packages.html#package-entry-points) by adding the entry point subpath after the package name. For example, to import mime’s `lite` entry point:

```js run=false
import mime from "mime/lite";
```

Unlike `npm:` imports, Node imports do not support semver ranges: the imported version is determined by what is installed in your `node_modules` directory. Use your package manager (_e.g._, edit your `package.json` and run `npm install`, or run `npm update`) to change which version is imported.

Imports from `node_modules` are cached in `.observablehq/cache/_node` within your [source root](./config#root) (typically `src`). You shouldn’t need to clear this cache as it is automatically managed, but feel free to clear it you like.

## Local imports

You can import JavaScript modules from local files. This is useful for organizing your code into modules that can be imported across multiple pages. You can also unit test your code and share code with other web applications.

For example, if this is `foo.js`:

```js run=false
export const foo = 42;
```

Then you can import `foo` as:

```js run=false
import {foo} from "./foo.js";
```

Within a local module, you can import other local modules, as well as `npm:`, Node, and remote imports. You can also reference local files within a local module by importing [`FileAttachment`](./files) from the Observable standard library like so:

```js run=false
import {FileAttachment} from "npm:@observablehq/stdlib";

export const sales = await FileAttachment("sales.csv").csv({typed: true});
```

Framework automatically watches imported local modules and their associated file attachments during preview, so any changes to imported modules or referenced files will instantly update in the browser via hot module replacement.

<div class="note">While there is <a href="./reactivity">reactivity</a> in Markdown across <a href="./javascript">code blocks</a>, there’s no reactivity within vanilla JavaScript modules. You can, however, export <a href="./reactivity#promises">async functions</a> and <a href="./reactivity#generators">generator functions</a> to define reactive variables.</div>

## Remote imports

Lastly, you can import a JavaScript file from an arbitrary URL at runtime. This is useful for loading a library from a remote server, say for an analytics script that isn’t published to a package registry and isn’t version-controlled.

The `npm:canvas-confetti` import above is approximately equivalent to importing from jsDelivr using `/+esm`:

```js run=false
import confetti from "https://cdn.jsdelivr.net/npm/canvas-confetti/+esm";
```

Unlike `npm:` and `node_modules` imports, remote imports are not self-hosted; the module will be fetched from the remote server at runtime. Use remote imports with caution as they are less secure and may degrade performance.

## Dynamic imports

Dynamic imports, also known as [*import expressions*](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import), can be used to load a library lazily, say when a user clicks a button. This can improve performance if the library is not needed to render content that is visible on page load. Unlike static imports, dynamic imports are not [preloaded](#module-preloads).

```js run=false
const {default: confetti} = await import("npm:canvas-confetti");
```

You can use dynamic imports with `npm:`, Node, local, and remote imports. However, Framework can only resolve statically-analyzable dynamic imports, as when `import` is passed a single string literal.

## Import resolutions

You can use [`import.meta.resolve`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import.meta/resolve) to invoke Framework’s import resolution statically. This function takes an import specifier and returns the resolved URL. For example:


```js echo
import.meta.resolve("npm:canvas-confetti")
```

While useful for debugging, `import.meta.resolve` also allows you to download files from npm. These files are automatically downloaded for self-hosting, too. For example, to load U.S. county geometry:

```js run=false
const data = await fetch(import.meta.resolve("npm:us-atlas/counties-albers-10m.json")).then((r) => r.json());
```

As with dynamic imports, you can use import resolutions with `npm:`, Node, local, and remote imports; and Framework only resolves statically-analyzable import resolutions, as when `import.meta.resolve` is passed a single string literal.

## Module preloads

Static imports are [preloaded](#module-preloads) such that imported modules are loaded in parallel and as early as possible, rather than being chained and waiting until JavaScript code execution. This can dramatically reduce page load times. Framework also preloads imports for [`FileAttachment`](./files) methods, such as d3-dsv for [CSV](./lib/csv).

An import of canvas-confetti is preloaded as:

```html run=false
<link rel="modulepreload" href="/_npm/canvas-confetti@1.9.2/_esm.js">
```

Module preloading applies to transitive dependencies, too. For example, d3-array depends on isoformat and internmap, which together are preloaded as:

```js
import "npm:d3-array";
```

```html run=false
<link rel="modulepreload" href="/_npm/d3-array@3.2.4/_esm.js">
<link rel="modulepreload" href="/_npm/isoformat@0.2.1/_esm.js">
<link rel="modulepreload" href="/_npm/internmap@2.0.3/_esm.js">
```

Module preloading does not apply to [dynamic imports](#dynamic-imports) and [`import.meta.resolve`](#import-resolutions), as these imports are not always needed and are assumed lower priority. You can manually declare a preload if desired:

```html run=false
<link rel="modulepreload" href="npm:d3-array">
```

## Implicit imports

For convenience, Framework provides recommended libraries by default in Markdown. These implicit imports are only evaluated if you reference the corresponding symbol and hence don’t add overhead if you don’t use them; for example, D3 won’t be loaded unless you reference `d3`.

Click on any of the imported symbols below to learn more.

<pre><code class="language-js">import {<a href="./files">FileAttachment</a>} from "npm:@observablehq/stdlib";</code></pre>
<pre><code class="language-js">import {<a href="./reactivity#generators">Generators</a>} from "npm:@observablehq/stdlib";</code></pre>
<pre><code class="language-js">import {<a href="./reactivity#mutables">Mutable</a>} from "npm:@observablehq/stdlib";</code></pre>
<pre><code class="language-js">import <a href="./lib/dot">dot</a> from "npm:@observablehq/dot";</code></pre>
<pre><code class="language-js">import * as <a href="./lib/duckdb">duckdb</a> from "npm:@duckdb/duckdb-wasm";</code></pre>
<pre><code class="language-js">import {<a href="./lib/duckdb">DuckDBClient</a>} from "npm:@observablehq/duckdb";</code></pre>
<pre><code class="language-js">import {<a href="./sql">sql</a>} from "npm:@observablehq/duckdb";</code></pre>
<pre><code class="language-js">import * as <a href="./lib/inputs">Inputs</a> from "npm:@observablehq/inputs";</code></pre>
<pre><code class="language-js">import <a href="./lib/mapbox-gl">mapboxgl</a> from "npm:mapbox-gl";</code></pre>
<pre><code class="language-js">import <a href="./lib/mermaid">mermaid</a> from "npm:@observablehq/mermaid";</code></pre>
<pre><code class="language-js">import * as <a href="./lib/plot">Plot</a> from "npm:@observablehq/plot";</code></pre>
<pre><code class="language-js">import <a href="./lib/sqlite">SQLite</a> from "npm:@observablehq/sqlite";</code></pre>
<pre><code class="language-js">import {<a href="./lib/sqlite">SQLiteDatabaseClient</a>} from "npm:@observablehq/sqlite";</code></pre>
<pre><code class="language-js">import <a href="./lib/tex">tex</a> from "npm:@observablehq/tex";</code></pre>
<pre><code class="language-js">import * as <a href="./lib/arrow">Arrow</a> from "npm:apache-arrow";</code></pre>
<pre><code class="language-js">import * as <a href="./lib/arquero">aq</a> from "npm:arquero";</code></pre>
<pre><code class="language-js">import * as <a href="./lib/echarts">echarts</a> from "npm:echarts";</code></pre>
<pre><code class="language-js">import * as <a href="./lib/d3">d3</a> from "npm:d3";</code></pre>
<pre><code class="language-js">import * as <a href="./lib/htl">htl</a> from "npm:htl";</code></pre>
<pre><code class="language-js">import {<a href="./lib/htl">html</a>} from "npm:htl";</code></pre>
<pre><code class="language-js">import {<a href="./lib/htl">svg</a>} from "npm:htl";</code></pre>
<pre><code class="language-js">import * as <a href="./lib/leaflet">L</a> from "npm:leaflet";</code></pre>
<pre><code class="language-js">import <a href="../lib/lodash">_</a> from "npm:lodash";</code></pre>
<pre><code class="language-js">import * as <a href="../lib/topojson">topojson</a> from "npm:topojson-client";</code></pre>

## Require

If you’re familiar with Observable notebooks, you may be familiar with `require`. We recommend that you avoid `require` as the underlying Asynchronous Module Definition (AMD) convention has been made obsolete by standard imports in JavaScript, and AMD tends to be implemented inconsistently.

If you really need `require`, you can import it from [d3-require](https://github.com/d3/d3-require):

```js run=false
import {require} from "npm:d3-require";
```

Then you can call `require` like so:

```js run=false
const d3 = await require("d3@5");
```

<div class="caution">We recommend that you use <code>import</code> instead of <code>require</code>: it’s the modern standard, more reliable, more forward-looking, and faster.</div>

## Routing

Imported modules are copied to the output root (`dist` by default) during build, too. Only referenced imported modules are copied; modules that aren’t imported are not included. For example, if you have the following source root:

```ini
.
├─ src
│  ├─ chart.js
│  └─ index.md
└─ ...
```

And `index.md` includes a JavaScript code block that says:

```js run=false
import {Chart} from "./chart.js";
```

The resulting output root is:

```ini
.
├─ dist
│  ├─ _import
│  │  └─ chart.c79c2048.js
│  ├─ _observablehq
│  │  └─ ... # additional assets for serving the site
│  └─ index.html
└─ ...
```

The import declaration is automatically rewritten during build to point to `./_import/chart.c79c2048.js` instead of `./chart.js`. The content hash `c79c2048` ensures cache-breaking during deploy, and allows assets to be marked as `cache-control: immutable` to improve performance.

Use a leading slash to denote paths relative to the source root, such as `/chart.js` instead of `./chart.js`. This allows you to use the same path to import a module from anywhere, even in nested folders. Framework always generates relative links so that the generated site can be served under a base path.
