<<<<<<< HEAD:test/output/build/fetches/_import/top.js
import { FileAttachment } from "../_observablehq/stdlib.js";
export { fooCsvData, fooJsonData } from "./foo/foo.js?sha=ddc538dfc10d83a59458d5893c89191ef3b2c9b1c02ef6da055423f37388ecf4";
=======
import {FileAttachment} from "../_observablehq/stdlib.js";
export {fooCsvData, fooJsonData} from "./foo/foo.6fd063d5.js";
>>>>>>> main:test/output/build/fetches/_import/top.d8f5cc36.js
export const topJsonData = await FileAttachment("../top-data.json", import.meta.url).json();
export const topCsvData = await FileAttachment("../top-data.csv", import.meta.url).text();
