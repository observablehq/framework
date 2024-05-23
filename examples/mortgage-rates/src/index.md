# Primary mortgage market survey

```js
const pmms = FileAttachment("data/pmms.csv").csv({typed: true});
const tidy = pmms.then((pmms) => pmms.flatMap(({date, pmms30, pmms15}) => [{date, rate: pmms30, type: "30Y FRM"}, {date, rate: pmms15, type: "15Y FRM"}]));
```

```js
const color = Plot.scale({color: {domain: ["30Y FRM", "15Y FRM"]}});
const colorLegend = (y) => html`<span style="border-bottom: solid 2px ${color.apply(`${y}Y FRM`)};">${y}-year fixed-rate</span>`;
```

```js
const defaultStartEnd = [pmms.at(-53).date, pmms.at(-1).date];
const startEnd = Mutable(defaultStartEnd);
const setStartEnd = (se) => startEnd.value = (se ?? defaultStartEnd);
const getStartEnd = () => startEnd.value;
```

```js
function frmCard(y, pmms) {
  const key = `pmms${y}`;
  const diff1 = pmms.at(-1)[key] - pmms.at(-2)[key];
  const diffY = pmms.at(-1)[key] - pmms.at(-53)[key];
  const range = d3.extent(pmms.slice(-52), (d) => d[key]);
  const stroke = color.apply(`${y}Y FRM`);
  return html.fragment`
    <h2 style="color: ${stroke}">${y}-year fixed-rate</b></h2>
    <h1>${formatPercent(pmms.at(-1)[key])}</h1>
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
        <td align="right">${formatPercent(d3.mean(pmms.slice(-4), (d) => d[key]))}</td>
      </tr>
      <tr>
        <td>52-week average</td>
        <td align="right">${formatPercent(d3.mean(pmms.slice(-52), (d) => d[key]))}</td>
      </tr>
    </table>
    ${resize((width) =>
      Plot.plot({
        width,
        height: 40,
        axis: null,
        x: {inset: 40},
        marks: [
          Plot.tickX(pmms.slice(-52), {
            x: key,
            stroke,
            insetTop: 10,
            insetBottom: 10,
            title: (d) => `${d.date?.toLocaleDateString("en-us")}: ${d[key]}%`,
            tip: {anchor: "bottom"}
          }),
          Plot.tickX(pmms.slice(-1), {x: key, strokeWidth: 2}),
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

<div class="grid grid-cols-2-3" style="margin-top: 2rem;">
  <div class="card">${frmCard(30, pmms)}</div>
  <div class="card">${frmCard(15, pmms)}</div>
  <div class="card grid-colspan-2 grid-rowspan-2" style="display: flex; flex-direction: column;">
    <h2>Rates ${startEnd === defaultStartEnd ? "over the past year" : startEnd.map((d) => d.toLocaleDateString("en-US")).join("–")}</h2><br>
    <span style="flex-grow: 1;">${resize((width, height) =>
      Plot.plot({
        width,
        height,
        y: {grid: true, label: "rate (%)"},
        color,
        marks: [
          Plot.lineY(tidy.filter((d) => startEnd[0] <= d.date && d.date < startEnd[1]), {x: "date", y: "rate", stroke: "type", curve: "step", tip: true, markerEnd: true})
        ]
      })
    )}</span>
  </div>
</div>

<div class="grid">
  <div class="card">
    <h2>Rates over all time (${d3.extent(pmms, (d) => d.date.getUTCFullYear()).join("–")})</h2>
    <h3>Click or drag to zoom</h3><br>
    ${resize((width) =>
      Plot.plot({
        width,
        y: {grid: true, label: "rate (%)"},
        color,
        marks: [
          Plot.ruleY([0]),
          Plot.lineY(tidy, {x: "date", y: "rate", stroke: "type", tip: true}),
          (index, scales, channels, dimensions, context) => {
            const x1 = dimensions.marginLeft;
            const y1 = 0;
            const x2 = dimensions.width - dimensions.marginRight;
            const y2 = dimensions.height;
            const brushed = (event) => {
              if (!event.sourceEvent) return;
              let {selection} = event;
              if (!selection) {
                const r = 10; // radius of point-based selection
                let [px] = d3.pointer(event, context.ownerSVGElement);
                px = Math.max(x1 + r, Math.min(x2 - r, px));
                selection = [px - r, px + r];
                g.call(brush.move, selection);
              }
              setStartEnd(selection.map(scales.x.invert));
            };
            const pointerdowned = (event) => {
              const pointerleave = new PointerEvent("pointerleave", {bubbles: true, pointerType: "mouse"});
              event.target.dispatchEvent(pointerleave);
            };
            const brush = d3.brushX().extent([[x1, y1], [x2, y2]]).on("brush end", brushed);
            const g = d3.create("svg:g").call(brush);
            g.call(brush.move, getStartEnd().map(scales.x));
            g.on("pointerdown", pointerdowned);
            return g.node();
          }
        ]
      })
    )}
  </div>
</div>
