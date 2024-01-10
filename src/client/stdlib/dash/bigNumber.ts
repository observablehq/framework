import * as d3 from "npm:d3";
import {html} from "npm:htl";

export function BigNumber(
  number,
  {
    href,
    target = "_blank",
    title,
    subtitle,
    format = ",.2~f",
    columnGap = "10px",
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
    children
  }: {
    href?: string;
    target?: string;
    title?: string;
    subtitle?: string;
    format?: string | ((x: any) => string);
    columnGap?: string;
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
  const div = html`<figure class="bignumber">
    ${title != null ? html`<h2>${title}` : ""}
    ${subtitle != null ? html`<h3>${subtitle}` : ""}
    <dl style="display: flex; flex-wrap: wrap; align-items: baseline; column-gap: ${columnGap};">
      <dt>${(format as (x: any) => string)(number)}</dt>
      ${
        secondary == null
          ? null
          : html`<dd style="color: ${secondaryColor};" ${{title: secondaryTitle}}>${(
              secondaryFormat as (x: any) => string
            )(secondary)} ${secondaryArrow}`
      }
    </dl>
    ${children}
  </figure>`;
  return href == null ? div : html`<a href=${href} target=${target} style="color: inherit;">${div}</a>`;
}
