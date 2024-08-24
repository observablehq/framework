# Parameterized routes

Parameterized routes allow a single Markdown source file to generate many pages, or a single [data loader](./loaders) to generate many files.

A parameterized route is denoted by square brackets, such as `[param]`, in a file or directory name. For example, the following project structure could be used to generate a separate page for each product:

```
.
├─ src
│  ├─ index.md
│  └─ products
│      └─ [product].md
└─ ⋯
```

Then using the [**paths** config option](./config#paths), you can specify the list of product pages.

```js run=false
export default {
  paths: [
    "/products/100736",
    "/products/221797",
    "/products/399145",
    "/products/475651",
    …
  ]
};
```

More commonly, you’d use code to enumerate the list of paths, such as by querying a database to get the list of product identifiers. For example, using [Postgres.js](https://github.com/porsager/postgres/blob/master/README.md#usage) you might say:

```js run=false
export default {
  paths: (await sql`SELECT id FROM products`).map(({id}) => `/products/${id}`)
};
```

Within a parameterized page, `observable.params.param` exposes the value of the parameter `param` to JavaScript (and likewise for any imported JavaScript modules with parameterized routes). While for a parameterized data loader, parameter values are passed as command-line flags such as `--param`.
