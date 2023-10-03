# Hello dashboard

This is a dashboard.

```js
const mainplot = resize((width, height) => Plot.plot({
  width,
  height,
  margin: 17,
  marginLeft: 40,
  y: {grid: true},
  marks: [
    Plot.axisY({label: "Price ($)"}),
    Plot.lineY(aapl, {x: "Date", y: "Close", channels: {Volume: "Volume"}, tip: {format: {x: true, y: true}}})
  ]
}));

const focus = Generators.observe((notify) => {
  notify(aapl.at(-1));
  mainplot.oninput = () => notify(mainplot.querySelector("svg").value ?? aapl.at(-1));
});
```

<div class="grid grid-cols-3" style="grid-auto-rows: 85px;">
  <div style="display: flex; align-items: center;">${resize((width, height) => BigNumber(focus.Close, {width, height, title: "Close", trend: (focus.Close - aapl.at(-2).Close) / aapl.at(-2).Close}))}</div>
  <div style="display: flex; align-items: center;">${resize((width, height) => BigNumber(focus.Volume, {width, height, title: "Trading volume", format: ".3~s", trend: (focus.Volume - aapl.at(-2).Volume) / aapl.at(-2).Volume}))}</div>
  <div style="display: flex; align-items: center;">${resize((width, height) => BigNumber(d3.extent(aapl.slice(-90), (d) => d.Close).map((d) => d.toFixed(1)).join("–"), {width, height, title: "90-day range", trend: null}))}</div>
</div>

<div class="grid grid-cols-3">
  <div class="grid-colspan-2 grid-rowspan-2">${mainplot}</div>
  <div>${tex.block`\displaystyle {\begin{aligned}&C(0,t)=0{\text{ for all }}t\\&C(S,t)\rightarrow S-K{\text{ as }}S\rightarrow \infty \\&C(S,T)=\max\{S-K,0\}\end{aligned}}`}</div>
  <div>${resize((width, height) => Plot.plot({
    width,
    height,
    marks: [Plot.frame()]
  }))}</div>
</div>

<div class="grid grid-cols-3">
  <div class="grid-colspan-2">${resize((width, height) => Plot.plot({
    width,
    height,
    margin: 17,
    marginLeft: 40,
    y: {transform: (d) => d / 1e6},
    marks: [
      Plot.axisY({label: "Trading volume (millions per day)"}),
      Plot.rectY(aapl, Plot.binX({y: "mean"}, {interval: "month", x: "Date", y: "Volume", tip: {format: {x2: null}}})),
      Plot.ruleX(aapl, Plot.binX({y1: "min", y2: "max"}, {stroke: "#ccc", inset: 4, interval: "month", x: "Date", y: "Volume"})),
      Plot.ruleY([0])
    ]
  }))}</div>
  <div>${resize((width, height) => Plot.plot({
    width,
    height,
    marks: [Plot.frame()]
  }))}</div>
</div>

This dashboard features a bento box layout. I am writing some words here to demonstrate how prose might fit between sections of a dashboard. Currently you have to write a lot of CSS grid, but we could create reusable components.

<div class="grid grid-cols-3">
  <div class="grid-colspan-2" style="padding: 0;">${Inputs.table(aapl)}</div>
  <div>${resize((width, height) => Plot.plot({
    width,
    height,
    marks: [Plot.frame()]
  }))}</div>
</div>

```js
function resize(run) {
  let frame;
  const div = Object.assign(document.createElement("DIV"), {style: "position: relative; height: 100%;"});
  const content = div.appendChild(document.createElement("DIV"), {style: "position: absolute;"});
  const observer = new ResizeObserver(([entry]) => {
    const {width, height} = entry.contentRect;
    while (content.lastChild) content.lastChild.remove();
    content.append(run(width, height));
  });
  observer.observe(div);
  return div;
}

function BigNumber(
  number,
  {
    width,
    height,
    title = "",
    format = ",.2~f",
    trend,
    trendFormat = "+.1~%",
    trendColor = trend > 0 ? "green" : trend < 0 ? "red" : "orange",
    trendArrow = trend > 0 ? "↗︎" : trend < 0 ? "↘︎" : "→",
    plot
  } = {}
) {
  if (typeof format !== "function") format = typeof number === "string" ? String : d3.format(format);
  if (typeof trendFormat !== "function") trendFormat = d3.format(trendFormat);
  return htl.html`<div style="display: flex; flex-direction: column; font-family: var(--sans-serif);">
  <div style="text-transform: uppercase; font-size: 12px;">${title}</div>
  <div style="display: flex; flex-wrap: wrap; column-gap: 10px; align-items: baseline;">
    <div style="font-size: 32px; font-weight: bold; line-height: 1;">${format(number)}</div>
    ${trend === null ? null : htl.html`<div style="font-size: 14px; color: ${trendColor};">${trendFormat(trend)} ${trendArrow}</div>`}
  </div>
  ${plot && Plot.plot({width, height, ...plot})}
</div>`;
}
```

<style type="text/css">

@media (prefers-color-scheme: light) {
  :root {
    --theme-background-color-alt: rgb(var(--theme-background-rgb));
    --theme-background-color: color-mix(in srgb, var(--theme-foreground-color) 5%, white);
  }
}

.grid {
  margin: 1rem 0;
  display: grid;
  grid-auto-rows: 192px;
  gap: 1rem;
}

.grid > * {
  background: var(--theme-background-color-alt);
  border: solid 1px rgba(var(--theme-foreground-rgb), 0.2);
  border-radius: 0.75rem;
  padding: 1rem;
  overflow: hidden;
}

.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }

.grid-colspan-2 { grid-column: span 2; }
.grid-colspan-3 { grid-column: span 3; }
.grid-colspan-4 { grid-column: span 4; }
.grid-rowspan-2 { grid-row: span 2; }
.grid-rowspan-3 { grid-row: span 3; }
.grid-rowspan-4 { grid-row: span 4; }

</style>
