import {FileAttachment} from "npm:@observablehq/stdlib";
import * as Plot from "npm:@observablehq/plot";

export {bar} from "./bar.js";
export const foo = 42;

export const file = FileAttachment("./pryvit.txt").text("utf-16be");
export const p = Plot;
