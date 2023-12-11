# JavaScript: Imports

TK Describe how you can import any library from npm without having to install it into `node_modules`. This is for convenience, and it’s why we use the `npm:` protocol for imports. (In the future we might also support bare module specifiers for packages that are installed into `node_modules`.)

You can import a library from npm like so:

```js echo
import confetti from "npm:canvas-confetti";
```

Now you can reference the imported `confetti` anywhere on the page.

```js echo
Inputs.button("Throw confetti!", {reduce: () => confetti()})
```

TK Describe the recommended libraries that are available by default in Markdown. These are included for convenience, but you can also import them explicitly if you prefer.

| module                 | symbol                 | specifier
|------------------------|------------------------|-
| `FileAttachment`       | `FileAttachment`       | [`npm:@observablehq/stdlib`](./files)
| `Generators`           | `Generators`           | [`npm:@observablehq/stdlib`](../lib/generators)
| `Mutable`              | `Mutable`              | [`npm:@observablehq/stdlib`](./mutables)
| `_`                    | `default`              | [`npm:lodash`](../lib/lodash)
| `aq`                   | `*`                    | [`npm:arquero`](../lib/arquero)
| `Arrow`                | `*`                    | [`npm:apache-arrow`](../lib/arrow)
| `d3`                   | `*`                    | [`npm:d3`](../lib/d3)
| `dot`                  | `default`              | [`npm:@observablehq/dot`](../lib/dot)
| `duckdb`               | `*`                    | [`npm:@duckdb/duckdb-wasm`](../lib/duckdb)
| `DuckDBClient`         | `DuckDBClient`         | [`npm:@observablehq/duckdb`](../lib/duckdb)
| `htl`                  | `*`                    | [`npm:htl`](../lib/htl)
| `html`                 | `html`                 | [`npm:htl`](../lib/htl)
| `svg`                  | `svg`                  | [`npm:htl`](../lib/htl)
| `Inputs`               | `*`                    | [`npm:@observablehq/inputs`](../lib/inputs)
| `L`                    | `*`                    | [`npm:leaflet`](../lib/leaflet)
| `mermaid`              | `default`              | [`npm:@observablehq/mermaid`](../lib/mermaid)
| `Plot`                 | `*`                    | [`npm:@observablehq/plot`](../lib/plot)
| `SQLite`               | `default`              | [`npm:@observablehq/sqlite`](../lib/sqlite)
| `SQLiteDatabaseClient` | `SQLiteDatabaseClient` | [`npm:@observablehq/sqlite`](../lib/sqlite)
| `tex`                  | `default`              | [`npm:@observablehq/tex`](../lib/tex)
| `topojson`             | `*`                    | [`npm:topojson-client`](../lib/topojson)

TK Mention that we pin the library version at build time and preload transitive dependencies to improve performance and security, and in the future we plan on automatically downloading and bundling the libraries [#20](https://github.com/observablehq/cli/issues/20) into your built project to improve security and stability.

TK Also mention that local imports are useful for organizing your code and creating components and helpers that can be shared by multiple pages — or even another application. And you can write tests for your code. And that local ES modules are strictly vanilla JavaScript; there’s no reactive runtime within ES modules.

You can also import JavaScript from local ES modules. For example, if this is `foo.js`:

```js run=false
export const foo = 42;
```

Then you can say

```js echo
import {foo} from "./foo.js"
```

and the imported value of `foo` is: ${foo}.

TK Describe dynamic import and static string literal specifiers.

TK Why we don’t support `require`.
