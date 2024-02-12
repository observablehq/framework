import * as Plot from "npm:@observablehq/plot";

export function lineChart(data, {width, height = 94, x = "date", y, percent} = {}) {
  return Plot.plot({
    width,
    height,
    axis: null,
    insetTop: 10,
    insetLeft: -15,
    insetRight: -17,
    y: {zero: true, percent, domain: percent ? [0, 100] : undefined},
    marks: [Plot.areaY(data, {x, y, fillOpacity: 0.25}), Plot.lineY(data, {x, y, tip: true})]
  });
}
