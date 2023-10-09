---
title: Overview
---

# Observable CLI

The **Observable command-line interface (CLI)** is a static site generator for creating beautiful notebooks, reports, and dashboards by writing Observable Markdown with reactive JavaScript. Develop and preview pages locally; build and host them on any static file server, including GitHub Pages; or deploy and develop them collaboratively on the Observable cloud platform.

For example, here is a code block rendering an [Observable Plot](https://observablehq.com/plot):

```js show
Plot.plot({
  y: {grid: true},
  marks: [
    Plot.ruleY([0]),
    Plot.dot(gistemp, {x: "Date", y: "Anomaly", stroke: "Anomaly", tip: true})
  ]
})
```

The data is loaded from a CSV file:

```js show
const gistemp = FileAttachment("gistemp.csv").csv({typed: true});
```

And here is some inline JavaScript to show 1 + 2 = ${1 + 2}.

~~~md
And here is some inline JavaScript to show 1 + 2 = ${1 + 2}.
~~~

Observable Markdown uses the [Observable Runtime](https://github.com/observablehq/runtime) for reactivity. Dynamic values are defined as generators, say using [Inputs](https://github.com/observablehq/inputs). For example, try entering your name into the box below.

```js show
const name = view(Inputs.text({label: "Name", placeholder: "Enter your name"}));
```

Hello, *${name || "anonymous"}!*

~~~md
Hello, *${name || "anonymous"}!*
~~~

In the near future, Observable Markdown will support database clients and SQL fenced code blocks, too, so you’ll be able to query databases from Markdown.
