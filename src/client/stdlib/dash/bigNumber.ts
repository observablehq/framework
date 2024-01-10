import * as d3 from "npm:d3";
import {html} from "npm:htl";

export function BigNumber(
  number,
  {
    href,
    target = "_blank",
    title,
    format = ",.2~f",
    secondary,
    secondaryFormat = format,
    secondaryColor = secondary == null
      ? ""
      : secondary > 0
      ? "var(--theme-color-positive)"
      : secondary < 0
      ? "var(--theme-color-negative)"
      : "var(--theme-color-neutral)",
    secondaryArrow = secondary == null ? "" : secondary > 0 ? "↗︎" : secondary < 0 ? "↘︎" : "→",
    secondaryTitle,
    styles = {display: "flex", flexDirection: "column", fontFamily: "var(--sans-serif)"},
    children
  }: {
    href?: string;
    target?: string;
    title?: string;
    format?: string | ((x: any) => string);
    secondary?: number;
    secondaryFormat?: string | ((x: any) => string);
    secondaryColor?: string;
    secondaryArrow?: string;
    secondaryTitle?: string;
    styles?: {[key: string]: string};
    children?: Node | Iterable<Node>;
  } = {}
) {
  if (typeof format !== "function") format = typeof number === "string" ? String : d3.format(format);
  if (typeof secondaryFormat !== "function") secondaryFormat = d3.format(secondaryFormat);
  const div = html`<div style="${styles}">
    <div style="text-transform: uppercase; font-size: 12px;">${title}</div>
    <div style="display: flex; flex-wrap: wrap; column-gap: 10px; align-items: baseline;">
      <div style="font-size: 32px; font-weight: bold; line-height: 1;">${(format as (x: any) => string)(number)}</div>
      ${
        secondary == null
          ? null
          : html`<div style="font-size: 14px; color: ${secondaryColor};" ${{title: secondaryTitle}}>${(
              secondaryFormat as (x: any) => string
            )(secondary)} ${secondaryArrow}</div>`
      }
    </div>
    ${children}
  </div>`;
  return href == null ? div : html`<a href=${href} target=${target} style="color: inherit;">${div}</a>`;
}
