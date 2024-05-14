import * as Plot from "npm:@observablehq/plot";

export function bigNumber(largeText, subText, borderColor, width) {
  return Plot.plot({
    width,
    height: 250,
    marks: [
      Plot.text([largeText], {
        frameAnchor: "middle",
        fontSize: 100,
        fontWeight: 700,
        dy: -30
      }),
      Plot.text([subText], {
        frameAnchor: "middle",
        fontSize: 60,
        dy: 80,
        opacity: 0.8
      })
    ]
  });
}
