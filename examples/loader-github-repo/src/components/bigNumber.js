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
    trendColor = trend > 0 ? "green" : trend < 0 ? "red" : "yellow",
    trendArrow = trend > 0 ? "↗︎" : trend < 0 ? "↘︎" : "→",
    trendDescription,
    plot
  } = {}
) {
  if (typeof format !== "function") format = typeof number === "string" ? String : d3.format(format);
  if (typeof trendFormat !== "function") trendFormat = d3.format(trendFormat);
  const div = html`<div style="display: flex; flex-direction: column;">
    <h2>${title}</h2>
    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: baseline;">
      <div class="big">${format(number)}</div>
      ${trend == null
        ? null
        : html`<div class=${trendColor}>${trendFormat(trend)} ${trendArrow} ${trendDescription}</div>`}
    </div>
    ${plot}
  </div>`;
  return href == null ? div : html`<a href=${href} target=${target} style="color: inherit;">${div}</a>`;
}
