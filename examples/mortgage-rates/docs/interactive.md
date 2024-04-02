# Primary mortgage market survey (interactive)

```js
const pmms = FileAttachment("data/pmms.csv").csv({typed: true});
```

```js
const color = Plot.scale({color: {domain: ["30Y FRM", "15Y FRM"]}});
const colorLegend = (y) => html`<span style="border-bottom: solid 2px ${color.apply(`${y}Y FRM`)};">${y}-year fixed-rate</span>`;
```

```js
const tidy = pmms.flatMap(({date, pmms30, pmms15}) => [{date, rate: pmms30, type: "30Y FRM"}, {date, rate: pmms15, type: "15Y FRM"}]);
```

```js
function frmCard(y, pmms) {
  const key = `pmms${y}`;
  const pmmsSubset = pmms.filter(d => d.date.getFullYear() === selectedYear);
  const diff1 = pmmsSubset.at(-1)[key] - pmmsSubset.at(-2)[key];
  const diffY = pmmsSubset.at(-1)[key] - pmmsSubset.at(0)[key];
  const range = d3.extent(pmmsSubset, (d) => d[key]);
  const stroke = color.apply(`${y}Y FRM`);
  return html.fragment`
    <h2 style="color: ${stroke}">${y}-year fixed-rate in ${selectedYear}</b></h2>
    <h1>${formatPercent(pmmsSubset.at(-1)[key])}</h1>
    <table>
      <tr>
        <td>1-week change</td>
        <td align="right">${formatPercent(diff1, {signDisplay: "always"})}</td>
        <td>${trend(diff1)}</td>
      </tr>
      <tr>
        <td>1-year change</td>
        <td align="right">${formatPercent(diffY, {signDisplay: "always"})}</td>
        <td>${trend(diffY)}</td>
      </tr>
      <tr>
        <td>4-week average</td>
        <td align="right">${formatPercent(d3.mean(pmmsSubset.slice(-4), (d) => d[key]))}</td>
      </tr>
      <tr>
        <td>52-week average</td>
        <td align="right">${formatPercent(d3.mean(pmmsSubset, (d) => d[key]))}</td>
      </tr>
    </table>
    ${resize((width) =>
      Plot.plot({
        width,
        height: 40,
        axis: null,
        x: {inset: 40},
        marks: [
          Plot.tickX(pmmsSubset, {
            x: key,
            stroke,
            insetTop: 10,
            insetBottom: 10,
            title: (d) => `${d.date?.toLocaleDateString("en-us")}: ${d[key]}%`,
            tip: {anchor: "bottom"}
          }),
          Plot.tickX(pmmsSubset.slice(-1), {x: key, strokeWidth: 2}),
          Plot.text([`${range[0]}%`], {frameAnchor: "left"}),
          Plot.text([`${range[1]}%`], {frameAnchor: "right"})
        ]
      })
    )}
    <span class="small muted">52-week range</span>
  `;
}

function formatPercent(value, format) {
  return value == null
    ? "N/A"
    : (value / 100).toLocaleString("en-US", {minimumFractionDigits: 2, style: "percent", ...format});
}

function trend(v) {
  return v >= 0.005 ? html`<span class="green">↗︎</span>`
    : v <= -0.005 ? html`<span class="red">↘︎</span>`
    : "→";
}

```

Each week, [Freddie Mac](https://www.freddiemac.com/pmms/about-pmms.html) surveys lenders on rates and points for their ${colorLegend(30)}, ${colorLegend(15)}, and other mortgage products. Data as of ${pmms.at(-1).date?.toLocaleDateString("en-US", {year: "numeric", month: "long", day: "numeric"})}.

```js
const selectedYear = view(Inputs.range(d3.extent(pmms, d => d.date.getFullYear()), {label: 'Year:', step: 1, value: 2023}));
```

<style type="text/css">

@container (min-width: 560px) {
  .grid-cols-2-3 {
    grid-template-columns: 1fr 1fr;
  }
  .grid-cols-2-3 .grid-colspan-2 {
    grid-column: span 2;
  }
}

@container (min-width: 840px) {
  .grid-cols-2-3 {
    grid-template-columns: 1fr 2fr;
    grid-auto-flow: column;
  }
}

</style>

<div class="grid grid-cols-2-3">
  <div class="card">${frmCard(30, pmms)}</div>
  <div class="card">${frmCard(15, pmms)}</div>
  <div class="card grid-colspan-2 grid-rowspan-2" style="display: flex; flex-direction: column;">
    <h2>Rates over the year ${selectedYear}</h2>
    <span style="flex-grow: 1;">${resize((width, height) =>
      Plot.plot({
        width,
        height,
        y: {grid: true, label: "rate (%)"},
        color,
        marks: [
          Plot.lineY(tidy.filter(d => d.date.getFullYear() === selectedYear), {x: "date", y: "rate", stroke: "type", curve: "step", tip: true, markerEnd: true})
        ]
      })
    )}</span>
  </div>
</div>

<div class="grid">
  <div class="card">
    <h2>Rates over all time (${d3.extent(pmms, (d) => d.date.getUTCFullYear()).join("–")})</h2>
    ${resize((width) =>
      Plot.plot({
        width,
        y: {grid: true, label: "rate (%)"},
        color,
        marks: [
          Plot.rectY([{year: selectedYear}], {x1: d => new Date(d.year, 0, 1), x2: d => new Date(d.year+1, 0), y1: 0, y2: d3.max(tidy, d => d.rate), fill: "var(--theme-foreground)", opacity: 0.15}),
          Plot.ruleY([0]),
          Plot.lineY(tidy, {x: "date", y: "rate", stroke: "type", tip: true})
        ]
      })
    )}
  </div>
</div>
