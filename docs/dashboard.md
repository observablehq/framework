<link rel="stylesheet" type="text/css" href="dashboard.css">

# Example dashboard

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
  <div style="display: flex; align-items: center;">${BigNumber(focus.Close, {width, title: "Close", trend: (focus.Close - aapl.at(-2).Close) / aapl.at(-2).Close})}</div>
  <div style="display: flex; align-items: center;">${BigNumber(focus.Volume, {width, title: "Trading volume", format: ".3~s", trend: (focus.Volume - aapl.at(-2).Volume) / aapl.at(-2).Volume})}</div>
  <div style="display: flex; align-items: center;">${BigNumber(d3.extent(aapl.slice(-90), (d) => d.Close).map((d) => d.toFixed(1)).join("–"), {width, title: "90-day range", trend: null})}</div>
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
