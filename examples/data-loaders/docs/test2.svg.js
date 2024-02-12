import * as Plot from "@observablehq/Plot";
import * as d3 from "d3";

const {document} = await import("https://esm.sh/linkedom@0.15").then(({parseHTML: p}) => p(`<a>`));

const barley = await d3.csv(
  "https://raw.githubusercontent.com/observablehq/plot/main/test/data/barley.csv",
  d3.autoType
);

const chart = Plot.plot({
  document,
  marginLeft: 110,
  height: 800,
  grid: true,
  x: {nice: true},
  y: {inset: 5},
  color: {type: "categorical"},
  facet: {marginRight: 90},
  marks: [
    Plot.frame(),
    Plot.dot(barley, {
      x: "yield",
      y: "variety",
      fy: "site",
      stroke: "year",
      sort: {fy: "x", y: "x", reduce: "median", reverse: true}
    })
  ]
});

return new Response(
  `${chart}`.replace(
    /^<svg /,
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" '
  ),
  {headers: {"Content-Type": "image/svg+xml"}}
);
