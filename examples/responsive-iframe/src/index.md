# Responsive iframe

This example demonstrates how to implement a responsive iframe using Observable Framework such that the height of the iframe automatically adjusts to show all of the content without scrolling. This example also demonstrates how to turn off Framework’s additional user interface elements (such as the sidebar) so that the embedded page contains only content.

Try resizing the width of the iframe using the slider below; notice that the height adjusts automatically.

```js
const iframeWidth = view(Inputs.range([200, 640], {step: 1, value: document.querySelector("#observablehq-main").offsetWidth, label: "Width"}));
```

<iframe id="iframe" scrolling="no" src="./embed"></iframe>

```html run=false
<iframe id="iframe" scrolling="no" src="./embed"></iframe>
```

```js
iframe.width = iframeWidth; // set the iframe width reactively
```

On the embedded page (`src/embed.md`), the following code uses a [ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver) to observe the content height and posts a message to the parent frame reporting the new height.

```js run=false
const observer = new ResizeObserver(([entry]) => parent.postMessage({height: entry.target.offsetHeight}, "*"));
observer.observe(document.documentElement);
invalidation.then(() => observer.disconnect());
```

<div class="note">

The `invalidation` promise is used to remove the old observer if the code is re-run. This is only needed during development.

</div>

In the parent frame (on this page, `src/index.md`), there’s a corresponding listener that receives messages and adjusts the height of the iframe accordingly.

```js echo
const messaged = (event) => iframe.height = event.data.height;
addEventListener("message", messaged);
invalidation.then(() => removeEventListener("message", messaged));
```

Lastly, the embedded page uses front matter to turn off the sidebar, header, footer, and pager. If you prefer, you can disable these for the entire project by adding these same options to the `observablehq.config.js` file.

```yaml run=false
---
sidebar: false
header: false
footer: false
pager: false
---
```
