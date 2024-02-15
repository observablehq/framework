import * as Plot from "npm:@observablehq/plot";
import * as d3 from "npm:d3";

export function punchcardChart(data, {label, value, ...options} = {}) {
  const aggregatedValues = d3
    .rollups(
      data,
      (v) => d3.median(v, (d) => d[value]),
      (d) => d.hour,
      (d) => d.dayOfWeek
    )
    .flatMap((d) => d[1].map((d) => d[1]));
  return Plot.plot({
    ...options,
    inset: 12,
    padding: 0,
    marginBottom: 10,
    grid: true,
    round: false,
    label: null,
    x: {
      axis: "top",
      domain: d3.range(24),
      interval: 1,
      tickFormat: (d) => (d % 12 || 12) + (d === 0 ? " AM" : d === 12 ? " PM" : "")
    },
    y: {
      domain: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      tickFormat: (d) => d.substr(0, 3)
    },
    r: {label, range: [1, 15], domain: d3.extent(aggregatedValues)},
    marks: [
      Plot.dot(
        data,
        Plot.group(
          {r: "median"},
          {
            y: "dayOfWeek",
            x: "hour",
            r: value,
            fill: "currentColor",
            stroke: "var(--theme-background)",
            sort: null,
            tip: true
          }
        )
      )
    ]
  });
}
