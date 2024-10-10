import {FileAttachment} from "../_observablehq/stdlib.00000003.js"/* observablehq-file */;
import * as Plot from "../_npm/@observablehq/plot@0.6.11/cd372fb8.js"/* observablehq-file */;

export async function Chart() {
  const gistemp = await FileAttachment({"name":"../lib/gistemp.csv","mimeType":"text/csv","path":"../_file/lib/gistemp.1cf298b1.csv"/* observablehq-file */,"lastModified":/* ts */1706742000000,"size":97, import.meta.url).csv({typed: true});
  return Plot.plot({
    y: {grid: true},
    color: {scheme: "burd"},
    marks: [
      Plot.dot(gistemp, {x: "Date", y: "Anomaly", stroke: "Anomaly"}),
      Plot.ruleY([0])
    ]
  });
}
