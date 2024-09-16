import {FileAttachment} from "npm:@observablehq/stdlib";

export const test = FileAttachment("./test.txt").text();
