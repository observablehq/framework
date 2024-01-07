---
theme: [auto, wide]
toc: false
---

# Grid test

```js
import {resize} from "npm:@observablehq/dash";
```

<div class="grid grid-cols-2">
  <div>${resize((width) => Plot.lineY(aapl, {x: "Date", y: "Close"}).plot({width}))}</div>
  <div>${resize((width) => Plot.lineY(aapl, {x: "Date", y: "Close"}).plot({width}))}</div>
</div>
