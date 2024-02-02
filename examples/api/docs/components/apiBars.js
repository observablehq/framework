import * as Plot from "npm:@observablehq/plot";

export function ApiBars(routes, {color, title, label, transform = (d) => d, format = Math.round, width, x, y, href}) {
  return Plot.plot({
    width,
    marginLeft: 10,
    x: {grid: true, insetRight: 110, transform, label},
    y: {axis: null, round: false},
    color,
    title,
    marks: [
      Plot.axisX({anchor: "top", labelAnchor: "left"}),
      Plot.rectX(routes, {x, y, fill: color && y, sort: {y: "-x"}}),
      Plot.ruleX([0]),
      Plot.text(routes, {x, y, dx: -6, text: Plot.valueof(routes, x).map(transform).map(format), fill: "var(--theme-background)", frameAnchor: "right"}), // prettier-ignore
      Plot.text(routes, {x, y, dx: 6, text: y, href, target: "_blank", frameAnchor: "left"})
    ]
  });
}
