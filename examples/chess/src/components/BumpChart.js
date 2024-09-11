import * as Plot from "npm:@observablehq/plot";
import * as d3 from "npm:d3";

export function BumpChart(data, {x = "month", y = "rating", z = "name", interval = "month", width} = {}) {
  const rank = Plot.stackY2({x, z, order: y, reverse: true});
  const [xmin, xmax] = d3.extent(Plot.valueof(data, x));
  return Plot.plot({
    width,
    x: {
      [width < 480 ? "insetRight" : "inset"]: 120,
      label: null,
      grid: true
    },
    y: {
      axis: null,
      inset: 20,
      reverse: true
    },
    color: {
      scheme: "spectral"
    },
    marks: [
      Plot.lineY(data, Plot.binX({x: "first", y: "first", filter: null}, {
        ...rank,
        stroke: z,
        strokeWidth: 24,
        curve: "bump-x",
        sort: {color: "y", reduce: "first"},
        interval,
        render: halo({stroke: "var(--theme-background-alt)", strokeWidth: 27})
      })),
      Plot.text(data, {
        ...rank,
        text: rank.y,
        fill: "black",
        stroke: z,
        channels: {[y]: y, "title\0": (d) => formatTitle(d.title), federation: "federation", born: (d) => String(d.born)},
        tip: {format: {y: null, text: null}}
      }),
      width < 480 ? null : Plot.text(data, {
        ...rank,
        filter: (d) => d[x] <= xmin,
        text: z,
        dx: -20,
        textAnchor: "end"
      }),
      Plot.text(data, {
        ...rank,
        filter: (d) => d[x] >= xmax,
        text: z,
        dx: 20,
        textAnchor: "start"
      })
    ]
  })
}

function halo({stroke = "currentColor", strokeWidth = 3} = {}) {
  return (index, scales, values, dimensions, context, next) => {
    const g = next(index, scales, values, dimensions, context);
    for (const path of [...g.childNodes]) {
      const clone = path.cloneNode(true);
      clone.setAttribute("stroke", stroke);
      clone.setAttribute("stroke-width", strokeWidth);
      path.parentNode.insertBefore(clone, path);
    }
    return g;
  };
}

function formatTitle(title) {
  return title === "GM" ? "Grand Master" : title;
}
