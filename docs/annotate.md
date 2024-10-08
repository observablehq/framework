# Annotate paths

Framework’s FileAttachment (direct call) ✅

```js echo
FileAttachment("./lib/miserables.json").json()
```

Static ESM imports & indirect FileAttachment ✅

```js echo
import {foo, bar} from "./foo.js";
display({foo, bar})
```

```js echo
import {Chart} from "./chart.js";
display(await Chart());
```

Dynamic ESM imports ✅

```js echo
const {Chart: c} = await import("./chart.js");
display(await c());
```

Resolving URLs via import.meta.resolve ✅

```js echo
const chartHelperURL = import.meta.resolve("./chart.js");
display(chartHelperURL);
```

modulepreload ❌
