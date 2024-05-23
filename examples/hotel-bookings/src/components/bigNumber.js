import * as Plot from "npm:@observablehq/plot";

export function bigNumber(metric, dateArray, value, compare, width) {
  return Plot.plot({
    width,
    height: 250,
    marks: [
      Plot.text([metric], {
        frameAnchor: "left",
        fontSize: 30,
        dy: -100,
        opacity: 0.8,
        fontWeight: 800
      }),
      Plot.text([dateArray], {
        frameAnchor: "left",
        fontSize: 30,
        fontStyle: "italic",
        text: (d) => `${d[0]} to ${d[1]}`,
        dy: -50
      }),
      Plot.text([value], {
        frameAnchor: "left",
        fontSize: 80,
        fontWeight: 800,
        dy: 30
      }),
      Plot.text([compare], {
        frameAnchor: "left",
        fontSize: 30,
        dy: 120
      })
    ]
  });
}
