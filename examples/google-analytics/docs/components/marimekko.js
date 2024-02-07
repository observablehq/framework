import * as Plot from "npm:@observablehq/plot";
import * as d3 from "npm:d3";

export function Marimekko({
  x,
  y,
  z,
  value = z,
  anchor = "middle",
  inset = 0.5,
  ...options
} = {}) {
  const stackX = /\bleft$/i.test(anchor) ? Plot.stackX1 : /\bright$/i.test(anchor) ? Plot.stackX2 : Plot.stackX;
  const stackY = /^top\b/i.test(anchor) ? Plot.stackY2 : /^bottom\b/i.test(anchor) ? Plot.stackY1 : Plot.stackY;
  const [Xv, setXv] = Plot.column(value);
  const {x: X, x1, x2, transform: tx} = stackX({offset: "expand", y, x: Xv});
  const {y: Y, y1, y2, transform: ty} = stackY({offset: "expand", x, y: value});
  return Plot.transform({x: X, x1, x2, y: Y, y1, y2, z, inset, frameAnchor: anchor, ...options}, (data, facets) => {
    const I = d3.range(data.length);
    const X = Plot.valueof(data, x);
    const Z = Plot.valueof(data, value);
    const sum = d3.rollup(I, I => d3.sum(I, i => Z[i]), i => X[i]);
    setXv(I.map(i => sum.get(X[i])));
    tx(data, facets);
    ty(data, facets);
    return {data, facets};
  });
}
