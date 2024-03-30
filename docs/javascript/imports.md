# JavaScript: Imports

You can load a library using an [`import` statement](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import). For example, to load [canvas-confetti](https://github.com/catdad/canvas-confetti) from [npm](https://www.npmjs.com/package/canvas-confetti):

```js echo
import confetti from "npm:canvas-confetti";
```

The imported symbols can then be referenced in any code block or inline expression — not only in the code block that declares the import.

```js echo
Inputs.button("Throw confetti! 🎉", {reduce: () => confetti()})
```

<div class="tip">Imports can live in code blocks anywhere on the page, but by convention, imports are commonly placed at the top of pages for readability.</div>

Framework provides a variety of ways to import. When you reference `d3`, `Inputs`, `Plot` or some other built-in, you’re [implicitly importing](#implicit-imports) from npm. In addition, you can import modules explicitly from:

- [npm](#npm-imports),
- [`node_modules`](#node-imports),
- [local paths](#local-imports), or
- [remote URLs](#url-imports).

With the exception of remote URL imports, imports are self-hosted: imported modules are downloaded if needed and bundled with your project, improving performance and security. In some cases you may need to specify additional files to download via [import resolutions](#dynamic-imports).

## npm imports

Framework downloads `npm:` imports, as above, from the [npm package registry](https://www.npmjs.com/) via the [jsDelivr CDN](https://www.jsdelivr.com/esm). Unlike [imports from `node_modules`](#node-imports), you don’t have to install `npm:` imports — just import, and the cloud shall provide. 😌

By default, npm imports resolve to the latest version of the given package. Imported versions are resolved on build, or during preview after you clear your [npm cache](#self-hosting-of-npm-imports) and restart the server.

To load an earlier or specific version of a package, add a [semver range](https://docs.npmjs.com/about-semantic-versioning). For example, to load major version 1 of `canvas-confetti`:

```js run=false
import confetti from "npm:canvas-confetti@1";
```

If the import path is not specified, it defaults to `/+esm`. The default entry point is determined by the `package.json`; see [jsDelivr’s GitHub](https://github.com/jsdelivr/jsdelivr/issues/18263) for details.

To load a different entry point, specify the desired path. For example, to load the `lite` entry point to the `mime` package:

```js echo
import mime from "npm:mime/lite";
```

Similarly, to load the file `dist/confetti.module.mjs` within `canvas-confetti`:

```js run=false
import confetti2 from "npm:canvas-confetti/dist/confetti.module.mjs";
```

With the imported path has a file extension, it will be loaded as-is. When it doesn’t, the `/+esm` directive is implicitly appended to have jsDelivr bundle the code as an ES module. You can also specify the `/+esm` directive explicitly, say to apply it to a path with an extension:

```js run=false
import confetti from "npm:canvas-confetti/dist/confetti.module.mjs/+esm";
```

If you’re having difficulty getting an import working, it may help to browse the package and see what files are available as well as what’s exported in the `package.json`. You can browse the contents of a published module via jsDelivr; for example, for `canvas-confetti` see <https://cdn.jsdelivr.net/npm/canvas-confetti/>.

### Self-hosting of npm imports

<!-- The downloaded library is [self-hosted](#self-hosting-of-npm-imports), meaning that you only need to fetch the file once from jsDelivr during preview or build, and that you built site won’t have a runtime dependency on jsDelivr’s API. -->

Framework automatically downloads `npm:` imports from jsDelivr during preview and build. This improves performance and security of your built site by removing external code dependencies. It also improves performance during local preview by only downloading libraries once.

Downloads from npm are cached in `.observablehq/cache/_npm` within your [source root](../config#root). You can clear the cache and restart the server to re-fetch the latest versions of libraries from npm.

Self-hosting of `npm:` imports applies to static imports, dynamic imports, and import resolutions (`import.meta.resolve`), provided the specifier is a static string literal. For example to load D3:

```js run=false
import * as d3 from "npm:d3";
```

```js run=false
const d3 = await import("npm:d3");
```

In both cases above, the latest version of `d3` is resolved and downloaded from jsDelivr as an ES module, including all of its transitive dependencies.

<div class="tip">You can load a library from a CDN at runtime by importing a URL. However, we recommend self-hosted <code>npm:</code> to improve performance and security, and to improve reliability by letting you control when you upgrade.</div>

Transitive static imports are also registered as module preloads (using `<link rel="modulepreload">`), such that the requests happen in parallel and as early as possible, rather than being chained. This dramatically improves performance on page load. Framework also preloads `npm:` imports for [`FileAttachment`](./files) methods, such as `d3-dsv` for [CSV](../lib/csv).

Framework automatically downloads files as needed for [recommended libraries](./imports#implicit-imports), and resolves import resolutions in transitive static and dynamic imports. For example, [DuckDB](../lib/duckdb) needs WebAssembly bundles, and [KaTeX](../lib/tex) needs a stylesheet and fonts. For any dependencies that are not statically analyzable (such as `fetch` calls or dynamic arguments to `import`) you can call `import.meta.resolve` to register additional files to download from npm.

## Node imports

Bare module specifiers, such as `d3` and `lodash`, are imported from `node_modules`. For example:

```js run=false
import {encode} from "he";
```

Supports entry points.

Does not support version ranges.

Only supports browser-compatible modules.

## Local imports

In addition to npm, you can import JavaScript from local modules. This is useful for organizing your code: you can move JavaScript out of Markdown and create components and helpers that can be imported across multiple pages. This also means you can write unit tests for your code, and share code with any other web applications.

For example, if this is `foo.js`:

```js run=false
export const foo = 42;
```

Then you can say

```js echo
import {foo} from "./foo.js";
```

and the imported value of `foo` is: ${foo}.

Observable Framework automatically watches imported local modules during preview, so any changes to these files will instantly update in the browser via hot module replacement.

<div class="note">While there is <a href="./reactivity">reactivity</a> across <a href="../javascript">JavaScript code blocks</a> in Markdown, there’s no reactivity within a JavaScript module. However, you can write <a href="./promises">async functions</a> and <a href="./generators">generator functions</a> to define reactive variables. And you can import the Observable standard library into local modules, so you can reference <a href="./files">files</a> and use other standard library features.</div>

TK You can use `npm:` and node imports within local modules, too.

## URL imports

You can import a JavaScript file from a URL. This is useful for loading a library that isn’t published to npm.

The `npm:canvas-confetti` import above is thus equivalent to:

```js run=false
import confetti from "https://cdn.jsdelivr.net/npm/canvas-confetti/+esm";
```

This is not exactly the same as importing `npm:canvas-confetti`: if you import from an external URL, the import won’t be self-hosted. Instead, the library will be fetched from the CDN at runtime. Importing a URL is most useful for loading a library that isn’t available on npm.

## Dynamic imports

[`import` expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import)

```js run=false
const {default: confetti} = await import("npm:canvas-confetti");
```

Framework only resolves statically-analyzable imports, as when the `import` function is passed a single string literal. Dynamic imports are primarily used to load imports lazily. You can also use dynamic imports to load a library from a URL (in which case Framework doesn’t need to resolve the URL).

## Import resolutions

You can use [`import.meta.resolve`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import.meta/resolve) to invoke Framework’s import resolution statically. This function takes an import specifier and returns the resolved URL. For example:


```js echo
import.meta.resolve("npm:canvas-confetti")
```

In addition to being useful for debugging, import resolutions allow you to download files from npm. These files are automatically downloaded for self-hosting, too. For example, to load U.S. county geometry:

```js run=false
const data = await fetch(import.meta.resolve("npm:us-atlas/counties-albers-10m.json")).then((r) => r.json());
```

## Module preloads

During build, Observable Framework will resolve the current exact version of the imported library from npm. Importing `npm:canvas-confetti` is thus equivalent to:

```js run=false
import confetti from "https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/+esm";
```

Version resolution locks the version of imported libraries so you don’t have to worry about new releases breaking your built site in the future. At the same time, you’ll conveniently get the latest version of libraries during local development and the next time you build.

In addition to resolving versions of directly-imported modules, Observable Framework recursively resolves dependencies, too! All transitively imported modules are automatically preloaded, greatly improving page load speed because the browser requests all imported modules in parallel.

```html run=false
<link rel="modulepreload" href="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/+esm">
```

<div class="note">Framework automatically downloads <code>npm:</code> imports from npm during preview and build, making the built site entirely self-contained. If you prefer not to self-host a module, and instead load it from an external server at runtime, import a full URL instead of using the <code>npm:</code> protocol.</div>

## Implicit imports

For convenience, Observable Framework provides recommended libraries by default in Markdown. These implicit imports are only evaluated if you reference the corresponding symbol and hence don’t add overhead if you don’t use them; for example, D3 won’t be loaded unless you have an unbound reference to `d3`.

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

If you’re familiar with Observable notebooks, you may have noticed that we don’t mention `require` above. We recommend that you avoid `require` as the underlying Asynchronous Module Definition (AMD) convention has been made obsolete by standard imports in JavaScript, and AMD tends to be implemented inconsistently by libraries.

If you really need `require`, you can import it from [d3-require](https://github.com/d3/d3-require):

```js run=false
import {require} from "npm:d3-require";
```

Then you can call `require` like so:

```js run=false
const d3 = require("d3@5");
```

<div class="tip">We recommend that you use <code>import</code> instead of <code>require</code>: it’s the modern standard, more reliable, more forward-looking, and faster.</div>
