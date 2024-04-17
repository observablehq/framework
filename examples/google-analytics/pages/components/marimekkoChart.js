import * as Plot from "npm:@observablehq/plot";
import * as d3 from "npm:d3";

export function marimekkoChart(data, {x, y, value, color, ...options} = {}) {
  const xy = (options) => Marimekko({...options, x, y, value});
  return Plot.plot({
    ...options,
    label: null,
    x: {percent: true, tickFormat: (d) => d + (d === 100 ? "%" : "")},
    y: {percent: true, tickFormat: (d) => d + (d === 100 ? "%" : "")},
    color,
    marks: [
      Plot.rect(data, xy({fill: y})),
      Plot.text(data, xy({text: y, dy: -16, fill: "black"})),
      Plot.text(data, xy({text: (d) => d[value].toLocaleString("en-US"), fontSize: 14, fontWeight: 600, fill: "black"})),
      Plot.text(
        data,
        Plot.selectMaxY(
          xy({
            z: x,
            text: (d) => capitalize(d[x]),
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

function capitalize([t, ...text]) {
  return t.toUpperCase() + text.join("");
}

// https://observablehq.com/@observablehq/plot-marimekko
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
