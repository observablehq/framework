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

(File and directory names can also be partially parameterized such as `prefix-[param].md` or `[param]-suffix.md`, or contain multiple parameters such as `[year]-[month]-[day].md`.)

The [**dynamicPaths** config option](./config#dynamicPaths) would then specify the list of product pages:

```js run=false
export default {
  dynamicPaths: [
    "/products/100736",
    "/products/221797",
    "/products/399145",
    "/products/475651",
    …
  ]
};
```

Rather than hard-coding the list of paths as above, you’d more commonly use code to enumerate them, say by querying a database for products. In this case, you can either use [top-level await](https://v8.dev/features/top-level-await) or specify the **dynamicPaths** config option as a function that returns an [async iterable](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#the_async_iterator_and_async_iterable_protocols). For example, using [Postgres.js](https://github.com/porsager/postgres/blob/master/README.md#usage) you might say:

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

## Params in JavaScript

Within a parameterized page, <code>observable.params.<i>param</i></code> exposes the value of the parameter <code><i>param</i></code> to JavaScript (and likewise for any imported JavaScript modules with parameterized routes). For example, to display the value of the `product` parameter in Markdown:

```md run=false
The current product is ${observable.params.product}.
```

Since parameter values are known statically at build time, you can reference parameter values in calls to `FileAttachment`. For example, to load the JSON file `/products/42.json` from the corresponding product page `/products/42`, you could say:

```js run=false
const info = FileAttachment(`${observable.params.product}.json`).json();
```

This is an exception: otherwise `FileAttachment` only accepts a static string literal as an argument since Framework uses [static analysis](./files#static-analysis) to find referenced files. If you need more flexibility, consider using a [page loader](./page-loaders) to generate the page.

## Params in loaders

For parameterized [data loaders](./data-loaders) and [page loaders](./page-loaders), parameter values are passed as command-line flags such as `--param`. For example, to parse the `--product` flag in Node.js, you can use [`parseArgs`](https://nodejs.org/api/util.html#utilparseargsconfig) from `node:util`:

```js run=false
import {parseArgs} from "node:util";

const {
  values: {product}
} = parseArgs({
  options: {product: {type: "string"}}
});

process.stdout.write(JSON.stringify({product}));
```

## Precedence

If multiple sources match a particular route, Framework choses the most-specific match. Exact matches are preferred over parameterized matches, and higher directories (closer to the root) are given priority over lower directories.

For example, for the page `/product/42`, the following sources might be considered:

* `/product/42.md` (exact match on static file)
* `/product/42.md.js` (exact match on page loader)
* `/product/[id].md` (parameterized static file)
* `/product/[id].md.js` (parameterized page loader)
* `/[category]/42.md` (static file in parameterized directory)
* `/[category]/42.md.js` (page loader in parameterized directory)
* `/[category]/[product].md` (etc.)
* `/[category]/[product].md.js`

(For brevity, only JavaScript page loaders are shown above; in practice Framework will consider all registered interpreters when checking for page loaders. [Archive data loaders](./data-loaders#archives) are also not shown.)
