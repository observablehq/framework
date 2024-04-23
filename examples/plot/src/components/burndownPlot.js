import * as Plot from "npm:@observablehq/plot";
import {resize} from "npm:@observablehq/stdlib";
import * as d3 from "npm:d3";

export function BurndownPlot(issues, {x, round = true, ...options} = {}) {
  const [start, end] = x.domain;
  const days = d3.utcDay.range(start, end);
  const burndown = issues.flatMap((issue) =>
    Array.from(
      days.filter((d) => issue.created_at <= d && (!issue.closed_at || d < issue.closed_at)),
      (d) => ({date: d, number: issue.number, created_at: issue.created_at})
    )
  );
  return resize((width) =>
    Plot.plot({
      width,
      round,
      x,
      ...options,
      marks: [
        Plot.axisY({anchor: "right", label: null}),
        Plot.areaY(
          burndown,
          Plot.groupX(
            {y: "count"},
            {
              x: "date",
              y: 1,
              curve: "step-before",
              fill: (d) => d3.utcMonth(d.created_at),
              tip: {format: {z: null}}
            }
          )
        ),
        Plot.ruleY([0])
      ]
    })
  );
}
