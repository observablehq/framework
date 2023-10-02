# Hello, world!
## This is Markdown

Look, ma! I loaded a CSV file.

```js
const gistemp = await FileAttachment("gistemp.csv").csv({typed: true})
```

```js
Plot.plot({
  y: {
    grid: true,
    tickFormat: "+f",
    label: "Surface temperature anomaly (°F)"
  },
  color: {
    scheme: "BuRd"
  },
  marks: [
    Plot.ruleY([0]),
    Plot.dot(gistemp, {x: "Date", y: "Anomaly", stroke: "Anomaly"})
  ]
})
```

And here’s an input.

```js
const fill = view(Inputs.color({label: "Fill", value: "#4682b4"}));
```

```js
Plot.plot({
  y: {percent: true},
  marks: [
    Plot.barY(alphabet, {x: "letter", y: "frequency", fill, sort: {x: "-y"}}),
    Plot.ruleY([0])
  ]
})
```

In publishing and graphic ${tex`E=mc^2`} design, Lorem ipsum is a placeholder text commonly used to demonstrate the visual form of a document or a typeface without relying on meaningful content. Lorem ipsum may be used as a placeholder before final copy is available. It is also used to temporarily replace text in a process called greeking, which allows designers to consider the form of a webpage or publication, without the meaning of the text influencing the design.

Lorem ipsum is typically a corrupted version of De finibus bonorum et malorum, a 1st-century BC text by the Roman statesman and philosopher Cicero, with words altered, added, and removed to make it nonsensical and improper Latin. The first two words themselves are a truncation of “dolorem ipsum” (“pain itself”).
