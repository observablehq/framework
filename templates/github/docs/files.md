# Files

```js
const chart = Treemap(projects, {
  path: (d) => d.name,
  label: (d) => `${d.name}\n${d.size.toLocaleString("en-US")}`,
  width,
  value: (d) => d.size,
  height: width / 4,
  tile: d3.treemapSquarify,
});

display(chart);
```

```js
const repo = view(Inputs.select(projects.map((d) => d.name)));
```

```js
const selected = projects.find(({ name }) => name === repo);
```

${d3.count(selected.tree, (d) => d.size).toLocaleString("en-US")} files, ${selected.size.toLocaleString("en-US")} bytes.

```js
const chart = Treemap(selected.tree, {
  path: (d) => d.path,
  width,
  label: (d) =>
    `${d.path.split("/").pop()}\n${d.size?.toLocaleString("en-US")}`,
  value: (d) => d.size,
  height: width,
  group: (d) =>
    `${d.path.split("/").slice(0, -1).slice(0, 2).join("/") || "/"}`,
});

display(chart);

display(
  html`<div class="swatches">
      ${Swatches(
        chart.scales.color.domain(chart.scales.color.domain().slice(0, 9))
      )}
    </div>
    <style>
      .swatches span::before {
        opacity: 0.7;
      }
    </style>`
);
```

```js
const rawfiles = FileAttachment("files.json").json();
import { Treemap } from "/components/treemap.js";
import { Swatches } from "/components/color-legend.js";
```

```js
const projects = d3.sort(
  rawfiles.map((d) => ({
    ...d,
    size: d3.sum(d.tree, (d) => d.size),
  })),
  (d) => -d.size
);
```

Treemap of ${html`<a href="https://github.com/${selected.name}/" target="\_blank">${selected.name}</a>`}.
