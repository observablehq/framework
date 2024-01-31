# JavaScript: Imports

You can load a library using an `import` statement. For example:

```js echo
import confetti from "npm:canvas-confetti";
```

<div class="tip">Thanks to <a href="./reactivity">reactivity</a>, imports can live in a JavaScript block anywhere on the page. But by convention, imports are commonly placed at the top of source files for readability.</div>

You can use an imported library anywhere on the page.

```js echo
Inputs.button("Throw confetti!", {reduce: () => confetti()})
```

## npm imports

An `npm:` specifier, as shown above, denotes that the imported library will be loaded from npm rather than from `node_modules`. You don’t have to install imported libraries beforehand — just import, and the cloud shall provide. (This convention is also [used by Deno](https://docs.deno.com/runtime/manual/node/npm_specifiers).)

Under the hood, `npm:` imports are powered by [jsDelivr’s esm.run CDN](https://www.jsdelivr.com/esm). The import above is thus equivalent to:

```js run=false
import confetti from "https://cdn.jsdelivr.net/npm/canvas-confetti/+esm";
```

<div class="note">We plan on supporting importing from <code>node_modules</code> using bare module specifiers (<i>e.g.</i>, <code>import confetti from "canvas-confetti"</code>). If you’d like this feature, please upvote <a href="https://github.com/observablehq/cli/issues/360">#360</a>.</div>

To load a specific version of a library, add a semver range:

```js run=false
import confetti from "npm:canvas-confetti@1";
```

To load a specific entry point, add a slash and the desired path:

```js run=false
import confetti from "npm:canvas-confetti@1/dist/confetti.module.mjs";
```

If you’re having difficulty getting an import working, it may help to browse the package and see what files are available as well as what’s exported in the `package.json`. You can browse the contents of a published module via jsDelivr; for example, for `canvas-confetti` see <https://cdn.jsdelivr.net/npm/canvas-confetti/>.

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

The preview server automatically watches imported local modules, so any changes to these files will instantly update in the browser via hot module replacement.

<div class="note">While there is <a href="./reactivity">reactivity</a> across <a href="../javascript">JavaScript code blocks</a> in Markdown, there’s no reactivity within a JavaScript module. However, you can write <a href="./promises">async functions</a> and <a href="./generators">generator functions</a> to define reactive variables. And you can import the Observable standard library into local modules, so you can reference <a href="./files">files</a> and use other standard library features.</div>

## Module preloads

During build, Observable will resolve the current exact version of the imported library from npm. Importing `npm:canvas-confetti` is thus equivalent to:

```js run=false
import confetti from "https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/+esm";
```

Version resolution locks the version of imported libraries so you don’t have to worry about new releases breaking your built site in the future. At the same time, you’ll conveniently get the latest version of libraries during local development and the next time you build.

In addition to resolving versions of directly-imported modules, Observable recursively resolves dependencies, too! All transitively imported modules are automatically preloaded, greatly improving page load speed because the browser requests all imported modules in parallel.

```html run=false
<link rel="modulepreload" href="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/+esm">
```

<div class="note">We’d also like to download imported modules from the CDN during build, making the built site entirely self-contained; see <a href="https://github.com/observablehq/cli/issues/20">#20</a>. This would further enable subresource integrity hashes; see <a href="https://github.com/observablehq/cli/issues/306">#306</a>.</div>

## Implicit imports

For convenience, Observable provides recommended libraries by default in Markdown. These implicit imports are only evaluated if you reference the corresponding symbol and hence don’t add overhead if you don’t use them; for example, D3 won’t be loaded unless you have an unbound reference to `d3`.

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

If you’re familiar with Observable notebooks, you may be familiar with `require`. We strongly recommend that you avoid `require` as the underlying Asynchronous Module Definition (AMD) convention has been made obsolete by standard imports in JavaScript, and AMD tends to be implemented inconsistently by libraries.

If you really need `require`, you can import it from [d3-require](https://github.com/d3/d3-require):

```js run=false
import {require} from "npm:d3-require";
```

Then you can call `require` like so:

```js run=false
const d3 = require("d3@5");
```

<div class="tip">We recommend that you use <code>import</code> instead of <code>require</code>: it’s the modern standard, more reliable, more forward-looking, and faster.</div>
