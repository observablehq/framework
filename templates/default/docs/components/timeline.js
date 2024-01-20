import * as Plot from "npm:@observablehq/plot";
import * as d3 from "npm:d3";

export function timeline(events) {
  return Plot.plot({
    insetTop: 30,
    insetBottom: 10,
    insetRight: 10,
    height: 250,
    x: {
      domain: d3.extent(events, (d) => d["year"]),
      label: "Year",
      nice: true,
    },
    y: { axis: null },
    marks: [
      Plot.axisX({tickFormat: d3.format(".0f")}),
      Plot.ruleX(events, {x: "year", y: "y", stroke: "#eee", strokeWidth: 2}),
      Plot.ruleY([0], {stroke: "#eee"}),
      Plot.dot(events, {x: "year", y: "y", fill: "currentColor", r: 5}),
      Plot.text(events, {
        x: "year",
        y: "y",
        text: "name",
        dy: -20,
        lineWidth: 10,
        fontSize: 12,
      }),
    ]
  });
}
