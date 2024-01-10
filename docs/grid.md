---
toc: false
theme: [light-alt, dark-alt, wide]
---

```js
import {resize} from "npm:@observablehq/dash";
```

```js
function AppleStockChart({width}) {
  return Plot.plot({
    title: "Apple stock price",
    subtitle: "The price of Apple stock continues to climb.",
    width,
    y: {grid: true},
    marks: [
      Plot.ruleY([0]),
      Plot.lineY(aapl, {x: "Date", y: "Close", tip: true})
    ]
  });
}
```

# Grid test

<div class="grid grid-cols-4">
  <div class="card">
    <h2>This card has a title</h2>
    <h3>And a subtitle, too</h3>
    <p>You can put paragraphs of text inside a card, also. But I wouldn’t put too much text inside a card as it’s a bit cramped.</p>
    <p>Here’s another paragraph.</p>
  </div>
  <div class="card">
    <h2>Hello, world!</h2>
  </div>
  <div class="card">
    <h2>Card three</h2>
  </div>
  <div class="card">
    <h2>Card four</h2>
  </div>
</div>

<div class="grid grid-cols-2">
  <div class="card">${resize((width) => AppleStockChart({width}))}</div>
  <div class="card">${resize((width) => AppleStockChart({width}))}</div>
</div>

<div class="grid grid-cols-4">
  <div class="card grid-colspan-3">${resize((width) => AppleStockChart({width}))}</div>
  <div>
    <p>You don’t need to put a border around a grid cell. You can use the grid layout without the <code>card</code> class and it looks like this. You might do this to put some explanatory text adjacent to a chart.</p>
    <p>Here lies another paragraph.</p>
  </div>
</div>
