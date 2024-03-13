# CSS: Grid

The `grid` class declares a [CSS grid](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout) container. The `grid` class is designed to pair with the [`card` class](./card) and the [`dashboard` theme](../themes) for dashboard layout.

```html echo
<div class="grid grid-cols-4">
  <div class="card"><h1>A</h1></div>
  <div class="card"><h1>B</h1></div>
  <div class="card"><h1>C</h1></div>
  <div class="card"><h1>D</h1></div>
</div>
```

Grids have a single column by default, but you can declare two, three, or four columns using the `grid-cols-2`, `grid-cols-3`, or `grid-cols-4` class.

The built-in `grid` class is automatically responsive: in narrow windows, the number of columns is automatically reduced. The four-column grid can be reduced to two or one columns, while the three- and two-column grid can be reduced to one column. (If you want more columns or more control over the grid layout, you can always write custom styles.)

<div class="tip">To see the responsive grid layout, resize the window or collapse the sidebar on the left. You can also zoom to change the effective window size.</div>

With multi-column and multi-row grids, you can use the `grid-colspan-*` and `grid-rowspan-*` classes to have cells that span columns and rows, respectively.

```html echo
<div class="grid grid-cols-2">
  <div class="card"><h1>A</h1>1 × 1</div>
  <div class="card grid-rowspan-2"><h1>B</h1>1 × 2</div>
  <div class="card"><h1>C</h1>1 × 1</div>
  <div class="card grid-colspan-2"><h1>D</h1>2 × 1</div>
</div>
```

By default, the `grid` uses `grid-auto-rows: 1fr`, which means that every row of the grid has the same height. The “rhythm” of equal-height rows is often desirable.

```html echo
<div class="grid grid-cols-2">
  <div class="card">Call me Ishmael.</div>
  <div class="card">Some years ago—never mind how long precisely—having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world.</div>
  <div class="card">It is a way I have of driving off the spleen and regulating the circulation.</div>
</div>
```

On the other hand, forcing all rows to the same height can waste space, since the height of all rows is based on the tallest content across rows. To have variable-height rows instead, you can either set [`grid-auto-rows`](https://developer.mozilla.org/en-US/docs/Web/CSS/grid-auto-rows) on the grid container:

```html echo
<div class="grid grid-cols-2" style="grid-auto-rows: auto;">
  <div class="card">Call me Ishmael.</div>
  <div class="card">Some years ago—never mind how long precisely—having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world.</div>
  <div class="card">It is a way I have of driving off the spleen and regulating the circulation.</div>
</div>
```

Or break your grid into multiple grids:

```html echo
<div class="grid grid-cols-2">
  <div class="card">Call me Ishmael.</div>
  <div class="card">Some years ago—never mind how long precisely—having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world.</div>
</div>
<div class="grid grid-cols-2">
  <div class="card">It is a way I have of driving off the spleen and regulating the circulation.</div>
</div>
```

The `card` class is not required to use `grid`. If you use `grid` by itself, you’ll get the same layout but without the card aesthetics.

```html echo
<div class="grid grid-cols-2">
  <div>Some years ago—never mind how long precisely—having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world.</div>
  <div class="card">Call me Ishmael.</div>
</div>
```

Use the `resize` helper to re-render content when the container resizes.

```html echo
<div class="grid grid-cols-4">
  <div class="card">
    ${resize((width) => `This card is ${width}px wide.`)}
  </div>
</div>
```

See [Responsive display](../javascript/display#responsive-display) for more.
