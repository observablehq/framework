# JavaScript: Imports

<!-- TK Describe how you can import any library from npm without having to install it into `node_modules`. This is for convenience, and it’s why we use the `npm:` protocol for imports. (In the future we might also support bare module specifiers for packages that are installed into `node_modules`.) -->

You can import a library from npm like so:

```js echo
import confetti from "npm:canvas-confetti";
```

Now you can reference the imported `confetti` anywhere on the page.

```js echo
Inputs.button("Throw confetti!", {reduce: () => confetti()})
```

You can also import JavaScript from local ES modules. For example, if this is `foo.js`:

```js run=false
export const foo = 42;
```

Then you can say

```js echo
import {foo} from "./foo.js";
```

and the imported value of `foo` is: ${foo}.

<!-- TK Also mention that local imports are useful for organizing your code and creating components and helpers that can be shared by multiple pages — or even another application. And you can write tests for your code. And that local ES modules are strictly vanilla JavaScript; there’s no reactive runtime within ES modules.
-->

<!-- TK Describe dynamic import and static string literal specifiers.
-->
<!-- ## Preloading -->

<!-- TK Mention that we ~~pin the library version at build time and~~ preload transitive dependencies to improve performance ~~and security~~, and in the future we plan on automatically downloading and bundling the libraries [#20](https://github.com/observablehq/cli/issues/20) into your built project to improve security and stability.
-->

## Implicit imports

For convenience, recommended libraries are available by default in Markdown. These implicit imports are only evaluated if you reference the corresponding symbol and hence don’t add overhead if you don’t use them; for example, D3 won’t be loaded unless you have an unbound reference to `d3`.

Click on any of the imported symbols below to learn more.

<pre><code class="language-js">import {<a href="./files">FileAttachment</a>} from "npm:@observablehq/stdlib";</code></pre>
<pre><code class="language-js">import {<a href="./generators">Generators</a>} from "npm:@observablehq/stdlib";</code></pre>
<pre><code class="language-js">import {<a href="./mutables">Mutable</a>} from "npm:@observablehq/stdlib";</code></pre>
<pre><code class="language-js">import <a href="../lib/dot">dot</a> from "npm:@observablehq/dot";</code></pre>
<pre><code class="language-js">import * as <a href="../lib/duckdb">duckdb</a> from "npm:@duckdb/duckdb-wasm";</code></pre>
<pre><code class="language-js">import {<a href="../lib/duckdb">DuckDBClient</a>} from "npm:@observablehq/duckdb";</code></pre>
<pre><code class="language-js">import * as <a href="../lib/inputs">Inputs</a> from "npm:@observablehq/inputs";</code></pre>
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

<!-- ## Require -->

<!-- TK Why we don’t support `require`. -->
