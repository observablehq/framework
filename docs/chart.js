import * as Plot from "npm:@observablehq/plot";
import {FileAttachment, resize} from "observablehq:stdlib";

export async function Chart() {
  const gistemp = await FileAttachment("./lib/gistemp.csv").csv({typed: true});
  return resize((width) =>
    Plot.plot({
      width,
      y: {grid: true},
      color: {scheme: "burd"},
      marks: [Plot.dot(gistemp, {x: "Date", y: "Anomaly", stroke: "Anomaly"}), Plot.ruleY([0])]
    })
  );
}
