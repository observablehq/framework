import {FileAttachment} from "observablehq:stdlib";

// Framework’s FileAttachment
FileAttachment("./lib/miserables.json").json();

// Static ESM imports
import {foo, bar} from "./foo.js";

import {Chart} from "./chart.js";

// Dynamic ESM imports
const {Chart: c} = await import("./chart.js");

// import.meta.resolve
const chartHelperURL = import.meta.resolve("./chart.js");

console.warn({foo, bar, Chart, c, chartHelperURL});
