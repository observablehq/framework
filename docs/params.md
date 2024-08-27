# Parameterized routes <a href="https://github.com/observablehq/framework/pull/1523" class="observablehq-version-badge" data-version="prerelease" title="Added in #1523"></a>

Parameterized routes allow a single [Markdown](./markdown) source file or [page loader](./page-loaders) to generate many pages, or a single [data loader](./data-loaders) to generate many files.

A parameterized route is denoted by square brackets, such as `[param]`, in a file or directory name. For example, the following project structure could be used to generate a page for many products:

```
.
├─ src
│  ├─ index.md
│  └─ products
│      └─ [product].md
└─ ⋯
```

Then using the [**dynamicPaths** config option](./config#dynamicPaths), you can specify the list of product pages:

```js run=false
export default {
  async *dynamicPaths() {
    yield* [
      "/products/100736",
      "/products/221797",
      "/products/399145",
      "/products/475651",
      …
    ];
  }
};
```

More commonly, you’d use code to enumerate the list of paths, say by querying a database for product identifiers. For example, using [Postgres.js](https://github.com/porsager/postgres/blob/master/README.md#usage) you might say:

```js run=false
import postgres from "postgres";

const sql = postgres(); // Note: uses psql environment variables

export default {
  async *dynamicPaths() {
    for await (const {id} of sql`SELECT id FROM products`.cursor()) {
      yield `/products/${id}`;
    }
  }
};
```

Within a parameterized page, `observable.params.param` exposes the value of the parameter `param` to JavaScript (and likewise for any imported JavaScript modules with parameterized routes). For example, to display the value of the `product` parameter in Markdown:

```md run=false
${observable.params.product}
```

Since parameter values are known statically, you can reference parameter values in calls to `FileAttachment`. (This is an exception: normally `FileAttachment` accepts only a static string literal as an argument since Framework uses [static analysis](./files#static-analysis) to determine referenced files.) For example, to load the JSON file `/products/475651.json` from the corresponding product page `/products/475651`, you could say:

```js run=false
const info = FileAttachment(`${observable.params.product}.json`).json();
```

For parameterized data loaders, parameter values are passed as command-line flags such as `--param`. For example, to parse the `--product` flag in Node.js, you can use [`parseArgs`](https://nodejs.org/api/util.html#utilparseargsconfig) from `node:util`:

```js run=false
import {parseArgs} from "node:util";

const {
  values: {product}
} = parseArgs({
  options: {product: {type: "string"}}
});

console.log(product);
```
