---
title: Overview
---

# Observable CLI

The **Observable command-line interface (CLI)** is a static site generator for creating beautiful notebooks, reports, and dashboards in Observable Markdown with reactive JavaScript. Use it to

- develop and preview Observable Markdown pages locally;
- build and host pages on any static file server, including GitHub Pages;
- or deploy and develop pages collaboratively on the Observable cloud platform.

For example, here is a chart using [Observable Plot](https://observablehq.com/plot):

```js
const gistemp = await FileAttachment("gistemp.csv").csv({typed: true});

display(
  Plot.plot({
    y: {grid: true},
    marks: [
      Plot.ruleY([0]),
      Plot.dot(gistemp, {x: "Date", y: "Anomaly", stroke: "Anomaly", tip: true})
    ]
  })
);
```

This chart is implemented as a live fenced code block:

````md
```js
const gistemp = await FileAttachment("gistemp.csv").csv({typed: true});

display(
  Plot.plot({
    y: {grid: true},
    marks: [
      Plot.ruleY([0]),
      Plot.dot(gistemp, {x: "Date", y: "Anomaly", stroke: "Anomaly", tip: true})
    ]
  })
);
```
````

You can also write inline expressions such as 1 + 2 = ${1 + 2}:

```md
You can also write inline expressions such as 1 + 2 = ${1 + 2}.
```

Observable Markdown uses the [Observable Runtime](https://github.com/observablehq/runtime) for reactivity. Dynamic values are defined as async generators, say using [Inputs](https://github.com/observablehq/inputs). For example, try entering your name into the box below.

```js show
const name = view(Inputs.text({label: "Name", placeholder: "Enter your name"}));
```

Hello, _${name || "anonymous"}!_

```md
Hello, _${name || "anonymous"}!_
```

In the near future, Observable Markdown will support database clients and SQL fenced code blocks, too, so you’ll be able to query databases too.
