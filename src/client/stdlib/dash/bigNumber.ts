import * as d3 from "npm:d3";
import {html} from "npm:htl";

export function BigNumber(
  number,
  {
    href,
    target = "_blank",
    title,
    format = ",.2~f",
    trend,
    trendFormat = "+.1~%",
    trendColor = trend == null ? "" : trend > 0 ? "green" : trend < 0 ? "red" : "orange",
    trendArrow = trend == null ? "" : trend > 0 ? "↗︎" : trend < 0 ? "↘︎" : "→",
    trendTitle,
    plot
  }: {
    href?: string;
    target?: string;
    title?: string;
    format?: string | ((x: any) => string);
    trend?: number;
    trendFormat?: string | ((x: any) => string);
    trendColor?: string;
    trendArrow?: string;
    trendTitle?: string;
    plot?: Node;
  } = {}
) {
  if (typeof format !== "function") format = typeof number === "string" ? String : d3.format(format);
  if (typeof trendFormat !== "function") trendFormat = d3.format(trendFormat);
  const div = html`<div style="display: flex; flex-direction: column; font-family: var(--sans-serif);">
    <div style="text-transform: uppercase; font-size: 12px;">${title}</div>
    <div style="display: flex; flex-wrap: wrap; column-gap: 10px; align-items: baseline;">
      <div style="font-size: 32px; font-weight: bold; line-height: 1;">${(format as (x: any) => string)(number)}</div>
      ${
        trend == null
          ? null
          : html`<div style="font-size: 14px; color: ${trendColor};" ${{title: trendTitle}}>${(
              trendFormat as (x: any) => string
            )(trend)} ${trendArrow}</div>`
      }
    </div>
    ${plot}
  </div>`;
  return href == null ? div : html`<a href=${href} target=${target} style="color: inherit;">${div}</a>`;
}
