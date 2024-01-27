/* eslint-disable import/no-named-as-default-member */
import {writeFile} from "node:fs/promises";
import he from "he";

const themes = {
  light: ["air", "cotton", "glacier", "parchment"],
  dark: ["coffee", "deep-space", "ink", "midnight", "near-midnight", "ocean-floor", "slate", "stark", "sun-faded"],
  composition: ["alt", "wide"],
  alias: ["default", "dashboard", "light", "dark"]
} as const;

function renderThemeThumbnail(theme: string, attributes: Record<string, string> = {}): string {
  return `<a href="./themes/${theme}" target="_blank" class="card thumbnail">
  <iframe scrolling="no" src="./themes/${theme}"${Object.entries(attributes)
    .map(([name, value]) => `${name}="${he.escape(value)}"`)
    .join(" ")}></iframe>
</a>`;
}

function renderThemeSection(themes: readonly string[]): string {
  return themes.map((theme) => renderThemeThumbnail(theme)).join("\n");
}

function renderIndex(): string {
  return `# Themes

<style>

.thumbnail {
  padding: 0;
  aspect-ratio: 960 / 320;
  overflow: hidden;
}

.thumbnail iframe {
  transform: scale(0.5);
  transform-origin: top left;
  pointer-events: none;
  width: 200%;
  height: 200%;
  border: none;
}

@container (min-width: 640px) and (max-width: 720px) {
  .thumbnail {
    aspect-ratio: 960 / 640;
  }
}

@container (min-width: 720px) and (max-width: 960px) {
  .thumbnail {
    aspect-ratio: 960 / 460;
  }
}

</style>

TODO Describe what a theme is, not what this page is, probably moving over the description from the configuration page.

This gallery provides a visual overview of the themes described in the [configuration](./config#theme) — where you can also read more about customizing the appearance of your projects with custom stylesheets.

You can set themes for a project in the project configuration or in the page front matter like so:

\`\`\`yaml
---
theme: [glacier, slate]
---
\`\`\`

Specify both a light and a dark theme to allow your project to detect if a user has requested light or dark color themes.

## Light

<div class="grid grid-cols-2">${renderThemeSection(themes.light)}</div>

## Dark

<div class="grid grid-cols-2">${renderThemeSection(themes.dark)}</div>

## Variants

The following themes are composed with color themes.

The \`alt\` theme swaps the page and card background colors.

<div class="grid grid-cols-1" style="max-width: 960px;">${renderThemeThumbnail("alt")}</div>

The \`wide\` theme sets the width of the main column to the full width of the page.

<div class="grid grid-cols-1" style="max-width: 960px;">${renderThemeThumbnail("wide")}</div>

The \`dashboard\` theme composes the default light and dark themes (\`air\` and \`near-midnight\`) together with \`alt\` and \`wide\`.

<div class="grid grid-cols-1" style="max-width: 960px;">${renderThemeThumbnail("dashboard")}</div>
`;
}

function renderTheme(theme: string): string {
  return `---
theme: ${theme}
toc: false
---

<style>
#observablehq-sidebar-toggle {display: none;}
</style>


\`\`\`js
const subset = new Set(["Transportation and Utilities", "Mining and Extraction", "Finance", "Agriculture", "Information"]);
const industriesSubset = industries.filter(d => subset.has(d.industry));
const barData = [
  {Category: "Alpha", Value: 9.8},
  {Category: "Beta", Value: 7.8},
  {Category: "Gamma", Value: 6.3},
  {Category: "Delta", Value: 5},
  {Category: "Epsilon", Value: 4},
  {Category: "Zeta", Value: 3.2},
];
\`\`\`

# Theme: ${theme}

This is a preview of the \`${theme}\` [theme](../config#theme).

<div class="grid grid-cols-2">
  <div class="card">
    \${
      Plot.plot({
        title: 'Line graph title',
        subtitle: 'Subtitle goes here',
        x: {label: "X", ticks: 5},
        y: {grid: true, label: "Y", ticks: 4, tickFormat: "s"},
        style: "width: 100%;",
        height: 240,
        width: 460,
        marks: [
          Plot.ruleY([0]),
          Plot.lineY(industriesSubset, {x: "date", y: "unemployed", stroke: "industry", tip: true})
        ]
      })
    }
  </div>
  <div class="card">
    \${
      Plot.plot({
        title: 'Bar graph title',
        subtitle: 'Subtitle',
        marginLeft: 75,
        style: "width: 100%;",
        height: 240,
        width: 460,
        x: {domain: [0, 10]},
        marks: [
          Plot.rectX(barData, {x: "Value", y: "Category", fill: "Category"}),
          Plot.ruleX([0])
        ]
      })
    }
  </div>
</div>`;
}

await writeFile("./docs/themes.md", renderIndex());

for (const type in themes) {
  for (const theme of themes[type]) {
    await writeFile(`./docs/themes/${theme}.md`, renderTheme(theme));
  }
}
