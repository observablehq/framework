import * as Plot from "npm:@observablehq/plot";
import * as d3 from "npm:d3";

export const today = d3.utcDay(d3.utcHour.offset(d3.utcHour(), -10));
export const start = d3.utcYear.offset(today, -2);

export function DailyPlot(data, {title, label = title, domain, width, height = 200} = {}) {
  return Plot.plot({
    width,
    height,
    round: true,
    marginRight: 60,
    x: {
      domain: [start, today]
    },
    y: {
      grid: true,
      domain,
      label
    },
    marks: [
      Plot.axisY({
        anchor: "right",
        label: `${title} (line = 28-day, blue = 7-day)`
      }),
      Plot.areaY(
        data,
        Plot.filter((d) => d.date >= start, {
          x: "date",
          y: "value",
          curve: "step",
          fillOpacity: 0.2
        })
      ),
      Plot.ruleY([0]),
      Plot.lineY(
        data,
        Plot.filter(
          (d) => d.date >= start,
          Plot.windowY(
            {k: 7, anchor: "start", strict: true},
            {
              x: "date",
              y: "value",
              strokeWidth: 1,
              stroke: "var(--theme-foreground-focus)"
            }
          )
        )
      ),
      Plot.lineY(
        data,
        Plot.filter(
          (d) => d.date >= start,
          Plot.windowY({k: 28, anchor: "start", strict: true}, {x: "date", y: "value"})
        )
      ),
      Plot.tip(
        data,
        Plot.pointerX({
          x: "date",
          y: "value",
          format: {y: ",.0f"}
        })
      )
    ]
  });
}
