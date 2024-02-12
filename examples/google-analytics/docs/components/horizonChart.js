import * as Plot from "npm:@observablehq/plot";
import * as d3 from "npm:d3";

const bands = 5;
const opacityScale = d3.scaleLinear().domain([0, bands]).range([0.15, 0.85]);

export function horizonChart(data, {width, height, metric, title, caption, format, z, color, order}) {
  const step = d3.max(data, (d) => d[metric]) / bands;
  return Plot.plot({
    width,
    height,
    subtitle: title,
    caption,
    axis: null,
    // marginTop: 20,
    marginLeft: 10,
    marginRight: 10,
    color,
    y: {domain: [0, step]},
    x: {axis: true, domain: [new Date("2023-04-01"), new Date("2023-12-31")]},
    fy: {axis: null, domain: order, padding: 0.05},
    facet: {data, y: z},
    marks: [
      d3.range(bands).map((i) =>
        Plot.areaY(data, {
          x: "date",
          y: (d) => d[metric] - i * step,
          fill: z,
          fillOpacity: opacityScale(i),
          clip: true
        })
      ),
      Plot.tip(data, Plot.pointerX({x: "date", channels: {users: metric}, format: {fy: false}})),
      Plot.text(
        data,
        Plot.selectFirst({
          text: z,
          fontSize: 12,
          frameAnchor: "top-left",
          dx: 6,
          dy: 6,
          stroke: "var(--theme-background)",
          paintOrder: "stroke",
          fill: "currentColor"
        })
      )
    ]
  });
}
