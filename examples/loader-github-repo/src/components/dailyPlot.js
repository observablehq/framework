import * as d3 from "npm:d3";
import * as Plot from "npm:@observablehq/plot";

export const today = d3.utcDay(d3.utcHour.offset(d3.utcHour(), -10));
export const start = d3.utcYear.offset(today, -2);

export function DailyPlot(
  data,
  {
    title,
    label = title,
    x = "date",
    y = "value",
    domain = [0, 1.2 * d3.quantile(data, 0.95, (d) => d[y])],
    width,
    height = 200,
    startDate = start,
    endDate = today,
  } = {}
) {
  return Plot.plot({
    width,
    height,
    round: true,
    marginRight: 60,
    x: {
      domain: [startDate, endDate],
    },
    y: {
      grid: true,
      domain,
      label: label,
    },
    marks: [
      Plot.axisY({
        anchor: "right",
        label: `${title} (line = 28-day, blue = 7-day)`,
      }),
      Plot.areaY(
        data,
        Plot.filter((d) => d[x] >= startDate, {
          x,
          y,
          curve: "step",
          fillOpacity: 0.2,
        })
      ),
      Plot.ruleY([0]),
      Plot.lineY(
        data,
        Plot.filter(
          (d) => d[x] >= startDate,
          Plot.windowY(
            { k: 7, anchor: "start", strict: true },
            {
              x,
              y,
              strokeWidth: 1,
              stroke: "var(--theme-foreground-focus)",
            }
          )
        )
      ),
      Plot.lineY(
        data,
        Plot.filter(
          (d) => d[x] >= startDate,
          Plot.windowY({ k: 28, anchor: "start", strict: true }, { x, y })
        )
      ),
      Plot.tip(
        data,
        Plot.pointerX({
          x,
          y,
          format: { y: ",.0f" },
        })
      ),
    ],
  });
}
