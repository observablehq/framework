import {FileAttachment} from "../_observablehq/stdlib.00000004.js";
import * as Plot from "../_npm/@observablehq/plot@0.6.11/cd372fb8.js";

export async function Chart() {
  const gistemp = await FileAttachment({"name":"../lib/gistemp.csv","mimeType":"text/csv","path":"../_file/lib/gistemp.1cf298b1.csv","lastModified":/* ts */1706742000000,"size":97}, import.meta.url).csv({typed: true});
  return Plot.plot({
    y: {grid: true},
    color: {scheme: "burd"},
    marks: [
      Plot.dot(gistemp, {x: "Date", y: "Anomaly", stroke: "Anomaly"}),
      Plot.ruleY([0])
    ]
  });
}
