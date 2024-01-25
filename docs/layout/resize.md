# Layout: resize

`resize` is a helper function that provides a way to set the size of a chart, or other content, to fit into a container on your page.

`resize` takes a function that renders content, like a chart.  When the page is rendered, `resize` calls the render function with the **width** and, optionally the **height**, of its parent container.  If the page changes size, `resize` calls your function again with the new **width** and **height** values that re-renders the content to fit in the newly resized page.

## Width only

If your content defines its own height then only use the `width` parameter:

```js
html`<div class="grid grid-cols-2">
  <div class="card">
    ${resize((width) => Plot.barY([9, 4, 8, 1, 11, 3, 4, 2, 7, 5]).plot({width, height: 150}))}
  </div>
  <div class="card">
    ${resize((width) => Plot.barY([3, 4, 2, 7, 5, 9, 4, 8, 1, 11]).plot({width, height: 150}))}
  </div>
</div>`
```

```html run=false
<div class="grid grid-cols-2">
  <div class="card">
    ${resize((width) => Plot.barY([9, 4, 8, 1, 11, 3, 4, 2, 7, 5]).plot({width, height: 150}))}
  </div>
  <div class="card">
    ${resize((width) => Plot.barY([3, 4, 2, 7, 5, 9, 4, 8, 1, 11]).plot({width, height: 150}))}
  </div>
</div>
```

## Width and height

If your container defines a height, in this example `300px`, then you can use both the `width` and `height` parameters:


```js
html`<div class="grid grid-cols-2" style="grid-auto-rows: 300px;">
  <div class="card">
    ${resize((width, height) => Plot.barY([9, 4, 8, 1, 11, 3, 4, 2, 7, 5]).plot({width, height}))}
  </div>
  <div class="card">
    ${resize((width, height) => Plot.barY([3, 4, 2, 7, 5, 9, 4, 8, 1, 11]).plot({width, height}))}
  </div>
</div>`
```

```html run=false
<div class="grid grid-cols-2" style="grid-auto-rows: 300px;">
  <div class="card">
    ${resize((width, height) => Plot.barY([9, 4, 8, 1, 11, 3, 4, 2, 7, 5]).plot({width, height}))}
  </div>
  <div class="card">
    ${resize((width, height) => Plot.barY([3, 4, 2, 7, 5, 9, 4, 8, 1, 11]).plot({width, height}))}
  </div>
</div>
```

<div class="tip">If you are using <code>resize</code> with both <code>width</code> and <code>height</code> and see nothing rendered, it may be because your parent container does not have its own height specified.</div>
