import * as Plot from "npm:@observablehq/plot";

export function lineChart(data, {width, height = 94, x = "date", y, percent} = {}) {
  return Plot.plot({
    width,
    height,
    axis: null,
    margin: 0,
    insetTop: 10,
    insetLeft: -17,
    insetRight: -17,
    y: {zero: true, percent, domain: percent ? [0, 100] : undefined},
    marks: [Plot.areaY(data, {x, y, fillOpacity: 0.2}), Plot.lineY(data, {x, y, tip: true})]
  });
}
