# CSS: Color

The following custom properties are defined by the current [theme](../themes):

<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Color</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>--theme-foreground</code></td>
      <td><div style="background-color: var(--theme-foreground); width: 2rem; height: 1rem;"></div></td>
      <td>page foreground color, _e.g._ black</td>
    </tr>
    <tr>
      <td><code>--theme-background</code></td>
      <td><div style="background-color: var(--theme-background); width: 2rem; height: 1rem;"></div></td>
      <td>page background color, _e.g._ white</td>
    </tr>
    <tr>
      <td><code>--theme-background-alt</code></td>
      <td><div style="background-color: var(--theme-background-alt); width: 2rem; height: 1rem;"></div></td>
      <td>block background color, _e.g._ light gray</td>
    </tr>
    <tr>
      <td><code>--theme-foreground-alt</code></td>
      <td><div style="background-color: var(--theme-foreground-alt); width: 2rem; height: 1rem;"></div></td>
      <td>heading foreground color, _e.g._ brown</td>
    </tr>
    <tr>
      <td><code>--theme-foreground-muted</code></td>
      <td><div style="background-color: var(--theme-foreground-muted); width: 2rem; height: 1rem;"></div></td>
      <td>secondary text foreground color, _e.g._ dark gray</td>
    </tr>
    <tr>
      <td><code>--theme-foreground-faint</code></td>
      <td><div style="background-color: var(--theme-foreground-faint); width: 2rem; height: 1rem;"></div></td>
      <td>faint border color, _e.g._ middle gray</td>
    </tr>
    <tr>
      <td><code>--theme-foreground-fainter</code></td>
      <td><div style="background-color: var(--theme-foreground-fainter); width: 2rem; height: 1rem;"></div></td>
      <td>fainter border color, _e.g._ light gray</td>
    </tr>
    <tr>
      <td><code>--theme-foreground-faintest</code></td>
      <td><div style="background-color: var(--theme-foreground-faintest); width: 2rem; height: 1rem;"></div></td>
      <td>faintest border color, _e.g._ almost white</td>
    </tr>
    <tr>
      <td><code>--theme-foreground-focus</code></td>
      <td><div style="background-color: var(--theme-foreground-focus); width: 2rem; height: 1rem;"></div></td>
      <td>emphasis foreground color, _e.g._ blue</td>
    </tr>
  </tbody>
</table>

You can use this properties anywhere you like. For example, to style a line chart to match the focus color:

```js echo
Plot.lineY(aapl, {x: "Date", y: "Close", stroke: "var(--theme-foreground-focus)"}).plot()
```

A handful of color classes are also provided:

```html echo
<div class="red">I am red text.</div>
```

```html echo
<div class="yellow">I am yellow text.</div>
```

```html echo
<div class="green">I am green text.</div>
```

```html echo
<div class="blue">I am blue text.</div>
```

```html echo
<div class="muted">I am muted text.</div>
```
