import * as d3 from "npm:d3";
import {html} from "npm:htl";

export function trend(
  value /*: number */,
  {
    format = "+d",
    positive = "green",
    negative = "red",
    base = "muted",
    positiveSuffix = " ↗︎",
    negativeSuffix = " ↘︎",
    baseSuffix = ""
  } = {} /*
  as {
    format: string | ((x: number) => string);
    positive: string;
    negative: string;
    base: string;
    positiveSuffix: string;
    negativeSuffix: string;
    baseSuffix: string;
  }
  */
) /*: Node */ {
  if (typeof format === "string") format = d3.format(format);
  if (typeof format !== "function") throw new Error(`unsupported format ${format}`);
  return html`<span class="small ${value > 0 ? positive : value < 0 ? negative : base}">${format(value)}${
    value > 0 ? positiveSuffix : value < 0 ? negativeSuffix : baseSuffix
  }`;
}
