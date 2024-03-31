# JavaScript: Imports

You can load a library using an [`import` statement](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import). For example, to load [canvas-confetti](https://github.com/catdad/canvas-confetti) from [npm](https://www.npmjs.com/package/canvas-confetti):

```js echo
import confetti from "npm:canvas-confetti";
```

The code above imports the default export and is equivalent to:

```js run=false
import {default as confetti} from "npm:canvas-confetti";
```

Depending on the package, you may want to import specific named exports, or to import everything as a namespace. For example:

```js run=false
import {rollup} from "npm:d3-array";
```

```js run=false
import * as d3 from "npm:d3";
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
- [remote URLs](#url-imports).

With the exception of remote URL imports, imported modules are bundled with your project, improving performance and security. In some cases, such as stylesheets and WebAssembly modules, you may need to specify additional files to download via [`import.meta.resolve`](#dynamic-imports).

## npm imports

Framework downloads `npm:` imports, as above, from the [npm package registry](https://www.npmjs.com/) via the [jsDelivr CDN](https://www.jsdelivr.com/esm). Unlike [imports from `node_modules`](#node-imports), you don’t have to install `npm:` imports — just import, and the cloud shall provide. 😌

By default, npm imports resolve to the latest version of the given package. Imported versions are resolved on build, or during preview after you clear your [npm cache](#self-hosting-of-npm-imports) and restart the server. To load an earlier or specific version of a package, add a [semver range](https://docs.npmjs.com/about-semantic-versioning). For example, to load major version 1 of `canvas-confetti`:

```js run=false
import confetti from "npm:canvas-confetti@1";
```

If the import path is not specified, it defaults to the default entry point is determined by the `package.json`; see [jsDelivr’s GitHub](https://github.com/jsdelivr/jsdelivr/issues/18263) for details. To load a different entry point, specify the desired path. For example, to load `mime`’s `lite` entry point:

```js run=false
import mime from "npm:mime/lite";
```

Similarly, to load the file `dist/confetti.module.mjs` from `canvas-confetti`:

```js run=false
import confetti from "npm:canvas-confetti/dist/confetti.module.mjs";
```

If you’re having difficulty getting an import working, it may help to browse the package and see what files are available as well as what’s exported in the `package.json`. You can browse the contents of a published module via jsDelivr; for example, for `canvas-confetti` see <https://cdn.jsdelivr.net/npm/canvas-confetti/>.

### Self-hosting of npm imports

Framework downloads `npm:` imports from jsDelivr during preview and build. This improves performance and security of your built site by removing runtime dependencies on external sites. It also improves performance during local preview by only downloading libraries once.

Downloads from npm are cached in `.observablehq/cache/_npm` within your [source root](../config#root) (`docs` by default). You can clear the cache and restart the server to re-fetch the latest versions of libraries from npm.

Self-hosting of `npm:` imports applies to static imports, [dynamic imports](#dynamic-imports), and [`import.meta.resolve`](#import-resolutions), transitively. For dynamic imports and `import.meta.resolve`, Framework is only able to self-host import specifiers that are static string literals.

<div class="tip">You can load a library at runtime by <a href="#url-imports">importing a URL</a>. However, we recommend self-hosting imports for performance, security, and reliability.</div>

In addition to downloading modules, Framework downloads supporting files as needed for [recommended libraries](./imports#implicit-imports) and [`import.meta.resolve`](#import-resolutions). For example, [DuckDB](../lib/duckdb) needs WebAssembly modules, and [KaTeX](../lib/tex) needs a stylesheet and fonts.

## Node imports

If you prefer to manage dependencies with a package manager such as npm or Yarn, you can import from `node_modules` instead of importing from the npm package registry via jsDelivr. This is useful for exactly managing versions via lockfiles, for importing [private packages](https://docs.npmjs.com/creating-and-publishing-private-packages) from the npm registry, or for importing from a different registry such as [GitHub Packages](https://github.com/features/packages). Node imports are also useful for sharing code with other applications that do not support `npm:` protocol imports.

To import from `node_modules`, use a bare specifier without the `npm:` protocol, such as `d3` or `lodash`. For example, to import [he](https://github.com/mathiasbynens/he):

```js run=false
import he from "he";
```

As with `npm:` imports, you can import specific [entry points](https://nodejs.org/api/packages.html#package-entry-points). For example, to import `mime`’s `lite` entry point:

```js run=false
import mime from "mime/lite";
```

Unlike `npm:` imports, node imports do not support semver ranges: the imported version is determined by what is installed in your `node_modules` directory, which in turn is determined by your `package.json` file, your package manager’s lockfile, _etc._ Use your package manager (_e.g._, `npm update`) to change which version is imported.

Imports from `node_modules` are cached in `.observablehq/cache/_node` within your [source root](../config#root) (`docs` by default). You shouldn’t need to clear this cache, as it is automatically managed, but feel free to clear it you like.

Framework (via esbuild) automatically converts CommonJS to ES modules on a best-effort basis. Node imports are only supported for browser-compatible modules that do not rely on Node-specific APIs.

## Local imports

You can import JavaScript modules from local files. This is useful for organizing your code: you can move JavaScript out of Markdown by creating components and helpers that can be imported across multiple pages. You can also unit tests imported components, and share code with other web applications.

For example, if this is `foo.js`:

```js run=false
export const foo = 42;
```

Then you can say

```js echo
import {foo} from "./foo.js";
```

and the imported value of `foo` is: ${foo}.

Within a local module, you can import other local modules, as well as `npm:`, node, and URL imports. You can also reference local files within a local module by importing [`FileAttachment`](./files) from the Observable standard library:

```js run=false
import {FileAttachment} from "npm:@observablehq/stdlib";

export const sales = await FileAttachment("sales.csv").csv({typed: true});
```

Framework automatically watches imported local modules and their associated file attachments during preview, so any changes to imported modules or referenced files will instantly update in the browser via hot module replacement.

<div class="note">While there is <a href="./reactivity">reactivity</a> in Markdown across <a href="../javascript">code blocks</a>, there’s no reactivity within vanilla JavaScript modules. You can, however, export <a href="./promises">async functions</a> and <a href="./generators">generator functions</a> to define reactive variables.</div>

## URL imports

Lastly, you can import a JavaScript file from an arbitrary URL. This is useful for loading a library at runtime, say for an analytics script that isn’t published to a package registry or version-controlled.

The `npm:canvas-confetti` import above is approximately equivalent to:

```js run=false
import confetti from "https://cdn.jsdelivr.net/npm/canvas-confetti/+esm";
```

Unlike `npm:` and `node_modules` imports, imports from remote URLs will not be self-hosted; the module will be fetched from the remove server at runtime. Use this feature with caution, as it introduces security risks and may degrade performance.

## Dynamic imports

[Import expressions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import) are also supported. Use dynamic imports to load a library lazily, say when a user clicks a button. Unlike static imports, dynamic imports are not [preloaded](#module-preloads).

```js run=false
const {default: confetti} = await import("npm:canvas-confetti");
```

Framework only resolves statically-analyzable imports, as when the `import` function is passed a single string literal. Dynamic imports are primarily used to load imports lazily. You can also use dynamic imports to load a library from a URL (in which case Framework doesn’t need to resolve the URL).

## Import resolutions

You can use [`import.meta.resolve`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import.meta/resolve) to invoke Framework’s import resolution statically. This function takes an import specifier and returns the resolved URL. For example:


```js echo
import.meta.resolve("npm:canvas-confetti")
```

In addition to being useful for debugging, `import.meta.resolve` allow you to download files from npm. These files are automatically downloaded for self-hosting, too. For example, to load U.S. county geometry:

```js run=false
const data = await fetch(import.meta.resolve("npm:us-atlas/counties-albers-10m.json")).then((r) => r.json());
```

TKTK For any dependencies that are not statically analyzable (such as `fetch` calls or dynamic arguments to `import`), call `import.meta.resolve` to register additional files to download from npm.

## Module preloads

Transitive static imports are registered as [module preloads](#module-preloads) such that imported modules are loaded in parallel and as early as possible, rather than being chained and waiting until JavaScript code execution. This dramatically improves performance on page load. Framework also preloads imports for [`FileAttachment`](./files) methods, such as preloading `npm:d3-dsv` for [CSV](../lib/csv).

An import of `npm:canvas-confetti` is preloaded as:

```html run=false
<link rel="modulepreload" href="/_npm/canvas-confetti@1.9.2/_esm.js">
```

Module preloading automatically applies to transitive static imports. For example, an import of `npm:d3-array` which has two dependencies will be preloaded as:

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

For convenience, Framework provides recommended libraries by default in Markdown. These implicit imports are only evaluated if you reference the corresponding symbol and hence don’t add overhead if you don’t use them; for example, D3 won’t be loaded unless you have an unbound reference to `d3`.

Click on any of the imported symbols below to learn more.

<pre><code class="language-js">import {<a href="./files">FileAttachment</a>} from "npm:@observablehq/stdlib";</code></pre>
<pre><code class="language-js">import {<a href="./generators">Generators</a>} from "npm:@observablehq/stdlib";</code></pre>
<pre><code class="language-js">import {<a href="./mutables">Mutable</a>} from "npm:@observablehq/stdlib";</code></pre>
<pre><code class="language-js">import <a href="../lib/dot">dot</a> from "npm:@observablehq/dot";</code></pre>
<pre><code class="language-js">import * as <a href="../lib/duckdb">duckdb</a> from "npm:@duckdb/duckdb-wasm";</code></pre>
<pre><code class="language-js">import {<a href="../lib/duckdb">DuckDBClient</a>} from "npm:@observablehq/duckdb";</code></pre>
<pre><code class="language-js">import * as <a href="../lib/inputs">Inputs</a> from "npm:@observablehq/inputs";</code></pre>
<pre><code class="language-js">import <a href="../lib/mapbox-gl">mapboxgl</a> from "npm:mapbox-gl";</code></pre>
<pre><code class="language-js">import <a href="../lib/mermaid">mermaid</a> from "npm:@observablehq/mermaid";</code></pre>
<pre><code class="language-js">import * as <a href="../lib/plot">Plot</a> from "npm:@observablehq/plot";</code></pre>
<pre><code class="language-js">import <a href="../lib/sqlite">SQLite</a> from "npm:@observablehq/sqlite";</code></pre>
<pre><code class="language-js">import {<a href="../lib/sqlite">SQLiteDatabaseClient</a>} from "npm:@observablehq/sqlite";</code></pre>
<pre><code class="language-js">import <a href="../lib/tex">tex</a> from "npm:@observablehq/tex";</code></pre>
<pre><code class="language-js">import * as <a href="../lib/arrow">Arrow</a> from "npm:apache-arrow";</code></pre>
<pre><code class="language-js">import * as <a href="../lib/arquero">aq</a> from "npm:arquero";</code></pre>
<pre><code class="language-js">import * as <a href="../lib/d3">d3</a> from "npm:d3";</code></pre>
<pre><code class="language-js">import * as <a href="../lib/htl">htl</a> from "npm:htl";</code></pre>
<pre><code class="language-js">import {<a href="../lib/htl">html</a>} from "npm:htl";</code></pre>
<pre><code class="language-js">import {<a href="../lib/htl">svg</a>} from "npm:htl";</code></pre>
<pre><code class="language-js">import * as <a href="../lib/leaflet">L</a> from "npm:leaflet";</code></pre>
<pre><code class="language-js">import <a href="../lib/lodash">_</a> from "npm:lodash";</code></pre>
<pre><code class="language-js">import * as <a href="../lib/topojson">topojson</a> from "npm:topojson-client";</code></pre>

## Require

If you’re familiar with Observable notebooks, you be familiar with `require`. We recommend that you avoid `require` as the underlying Asynchronous Module Definition (AMD) convention has been made obsolete by standard imports in JavaScript, and AMD tends to be implemented inconsistently.

If you really need `require`, you can import it from [d3-require](https://github.com/d3/d3-require):

```js run=false
import {require} from "npm:d3-require";
```

Then you can call `require` like so:

```js run=false
const d3 = await require("d3@5");
```

<div class="caution">We recommend that you use <code>import</code> instead of <code>require</code>: it’s the modern standard, more reliable, more forward-looking, and faster.</div>
