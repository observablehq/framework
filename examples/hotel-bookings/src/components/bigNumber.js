import * as Plot from "npm:@observablehq/plot";

export function bigNumber(metric, value, compare, width) {
  return Plot.plot({
    width,
    height: 250,
    marks: [
      Plot.text([metric], {
        frameAnchor: "left",
        fontSize: 30,
        dy: -100,
        opacity: 0.8
      }),
      Plot.text([value], {
        frameAnchor: "left",
        fontSize: 80,
        fontWeight: 600,
        dy: -30
      }),
      Plot.text([compare], {
        frameAnchor: "left",
        fontSize: 30,
        dy: 40
      })
    ]
  });
}
