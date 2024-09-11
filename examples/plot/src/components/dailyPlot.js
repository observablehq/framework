import * as Plot from "npm:@observablehq/plot";

export function DailyPlot(data, {round = true, annotations, ...options} = {}) {
  return Plot.plot({
    ...options,
    round,
    marks: [
      Plot.axisY({anchor: "right", label: null}),
      Plot.areaY(data, {x: "date", y: "value", curve: "step", fillOpacity: 0.2}),
      Plot.ruleY([0]),
      Plot.lineY(
        data,
        Plot.windowY(
          {k: 7, anchor: "start", strict: true},
          {x: "date", y: "value", stroke: "var(--theme-foreground-focus)"}
        )
      ),
      Plot.lineY(data, Plot.windowY({k: 28, anchor: "start", strict: true}, {x: "date", y: "value"})),
      annotations && [
        Plot.ruleX(annotations, {x: "date", strokeOpacity: 0.1}),
        Plot.text(annotations, {
          x: "date",
          text: "text",
          href: "href",
          target: "_blank",
          rotate: -90,
          dx: -3,
          frameAnchor: "top-right",
          lineAnchor: "bottom",
          fontVariant: "tabular-nums",
          fill: "currentColor",
          stroke: "var(--theme-background)"
        })
      ],
      Plot.tip(data, Plot.pointerX({x: "date", y: "value"}))
    ]
  });
}
