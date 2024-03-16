---
index: true
sql:
  gaia: ./lib/gaia-sample.parquet
---

# PRQL <a href="https://github.com/observablehq/framework/pull/1078" target="_blank" class="observablehq-version-badge" data-version="prerelease" title="Added in #1078"></a>

[PRQL](https://prql-lang.org/) (pronounced “prequel”) is a “modern language for transforming data — a simple, powerful, pipelined SQL replacement.” To use PRQL instead of SQL, create a PRQL fenced code block (<code>```prql</code>). For example:

````md
```prql
from gaia
sort {phot_g_mean_mag}
take 10
```
````

This produces:

```prql
from gaia
sort {phot_g_mean_mag}
take 10
```

Because PRQL is compiled to SQL during build, Framework does not support a `prql` tagged template literal; PRQL can only be used in PRQL code blocks.

## prql-js

You can load `prql-js` as:

````md run=false
<script src="npm:prql-js/dist/web/prql_js.js"></script>
<script>self.wasm_bindgen = wasm_bindgen;</script>
````

```js echo
const {compile} = wasm_bindgen;
await wasm_bindgen(import.meta.resolve("npm:prql-js/dist/web/prql_js_bg.wasm"));
```

Then to use it:

```js echo
compile("from employees\nfilter salary > $1\nselect first_name")
```

<script src="npm:prql-js/dist/web/prql_js.js"></script>
<script>self.wasm_bindgen = wasm_bindgen;</script>
