# Page loaders <a href="https://github.com/observablehq/framework/pull/1523" class="observablehq-version-badge" data-version="prerelease" title="Added in #1523"></a>

Page loaders are like [data loaders](./data-loaders), but for pages.

Page loaders emit Markdown to standard out, and have a double extension starting with `.md`, such as `.md.js` for a JavaScript page loader.

```js run=false
import {parseArgs} from "node:util";

const {
  values: {dir}
} = parseArgs({
  options: {dir: {type: "string"}}
});

process.stdout.write(`# Hello ${dir}

I can also refer to it dynamically as $\{observable.params.dir}.

But not sure why I would do that over ${dir}.

~~~js
1 + observable.params.dir
~~~

~~~js
1 + ${JSON.stringify(dir)}
~~~

`);
```

<div class="tip">

To allow importing of a JavaScript page loader without running it, have the page loader check whether `process.argv[1]` is the same as `import.meta.url` before running:

```js run=false
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.stdout.write(`# Hello page`);
}
```

</div>
