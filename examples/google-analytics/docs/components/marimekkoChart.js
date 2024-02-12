import * as Plot from "npm:@observablehq/plot";
import * as d3 from "npm:d3";

export function marimekkoChart(data, {width, height, xDim, yDim, metric, title, caption, color}) {
  const xy = (options) => Marimekko({...options, x: xDim, y: yDim, value: metric});
  return Plot.plot({
    width,
    height,
    subtitle: title,
    caption,
    label: null,
    x: {percent: true, ticks: 10, tickFormat: (d) => (d === 100 ? `100%` : d)},
    y: {percent: true, ticks: 10, tickFormat: (d) => (d === 100 ? `100%` : d)},
    color,
    marks: [
      Plot.text(
        data,
        xy({
          text: (d) => d[metric].toLocaleString("en"),
          fontSize: 14,
          fontWeight: 600,
          stroke: yDim,
          fill: "var(--theme-background)"
        })
      ),
      Plot.rect(data, xy({fill: yDim, fillOpacity: 1})),
      Plot.frame({fill: "var(--theme-background)", fillOpacity: 0.2}),
      Plot.text(
        data,
        xy({
          text: yDim,
          fontSize: 11,
          dy: -16,
          fill: "var(--theme-background)"
        })
      ),
      Plot.text(
        data,
        xy({
          text: (d) => d[metric].toLocaleString("en"),
          fontSize: 14,
          fontWeight: 600,
          fill: "var(--theme-background)"
        })
      ),
      Plot.text(
        data,
        Plot.selectMaxY(
          xy({
            z: xDim,
            text: (d) => `${d[xDim].slice(0, 1).toUpperCase()}${d[xDim].slice(1)}`,
            anchor: "top",
            lineAnchor: "bottom",
            fontSize: 12,
            dy: -6
          })
        )
      )
    ]
  });
}

// TODO attribution
function Marimekko({x, y, z, value = z, anchor = "middle", inset = 0.5, ...options} = {}) {
  const stackX = /\bleft$/i.test(anchor) ? Plot.stackX1 : /\bright$/i.test(anchor) ? Plot.stackX2 : Plot.stackX;
  const stackY = /^top\b/i.test(anchor) ? Plot.stackY2 : /^bottom\b/i.test(anchor) ? Plot.stackY1 : Plot.stackY;
  const [X, setX] = Plot.column(x);
  const [Y, setY] = Plot.column(y);
  const [Xv, setXv] = Plot.column(value);
  const {x: Xs, x1, x2, transform: tx} = stackX({offset: "expand", y: Y, x: Xv, z: X, order: "appearance"});
  const {y: Ys, y1, y2, transform: ty} = stackY({offset: "expand", x, y: value, z: Y, order: "appearance"});
  return Plot.transform({x: Xs, x1, x2, y: Ys, y1, y2, z, inset, frameAnchor: anchor, ...options}, (data, facets) => {
    const X = setX(Plot.valueof(data, x));
    setY(Plot.valueof(data, y));
    const Xv = setXv(new Float64Array(data.length));
    const Z = Plot.valueof(data, value);
    for (const I of facets) {
      const sum = d3.rollup(
        I,
        (J) => d3.sum(J, (i) => Z[i]),
        (i) => X[i]
      );
      for (const i of I) Xv[i] = sum.get(X[i]);
    }
    tx(data, facets);
    ty(data, facets);
    return {data, facets};
  });
}
