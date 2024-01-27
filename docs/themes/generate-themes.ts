/* eslint-disable import/no-named-as-default-member */
import {writeFile} from "node:fs/promises";
import he from "he";
import {faint} from "../../src/tty.js";

const themes = {
  light: ["air", "cotton", "glacier", "parchment"],
  dark: ["coffee", "deep-space", "ink", "midnight", "near-midnight", "ocean-floor", "slate", "stark", "sun-faded"]
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

:root {
  --thumbnail-width: 920;
  --thumbnail-height: 450;
}

.thumbnail {
  padding: 0;
  aspect-ratio: var(--thumbnail-width) / var(--thumbnail-height);
  overflow: hidden;
}

.thumbnail iframe {
  transform: scale(calc(var(--container-width) / var(--thumbnail-width)));
  transform-origin: top left;
  pointer-events: none;
  width: calc(var(--thumbnail-width) * 1px);
  height: calc(var(--thumbnail-height) * 1px);
  border: none;
}

</style>

\`\`\`js
for (const card of document.querySelectorAll(".card")) {
  const observer = new ResizeObserver(([entry]) => {
    card.style.setProperty("--container-width", entry.contentRect.width);
  });
  observer.observe(card);
  invalidation?.then(() => observer.disconnect());
}
\`\`\`

Themes affect the visual appearance of pages by specifying colors and fonts, or by augmenting default styles. Observable Framework includes several built-in themes, but you can also design your own themes by specifying a [custom stylesheet](./config#style).

The built-in [light-mode color themes](#light-mode) are:

- \`air\` (default)
- \`cotton\`
- \`glacier\`
- \`parchment\`

The built-in [dark-mode color themes](#dark-mode) are:

- \`coffee\`
- \`deep-space\`
- \`ink\`
- \`midnight\`
- \`near-midnight\` (default)
- \`ocean-floor\`
- \`slate\`
- \`stark\`
- \`sun-faded\`

In addition, [theme modifiers](#modifiers) are intended to compose with the above color themes:

- \`alt\` - swap the page and card background colors
- \`wide\` - make the main column full-width

There are also special aliases:

- \`default\` - either \`light\` or \`dark\` depending on user preference
- \`dashboard\` - \`[light, dark]\` if needed, plus \`alt\` and \`wide\`
- \`light\` - an alias for \`air\`
- \`dark\` - an alias for \`near-midnight\`

A project’s theme is set via the [\`theme\` config option](./config#theme). For example, for \`cotton\`:

\`\`\`js run=false
theme: "cotton"
\`\`\`

You can also apply a theme to an individual page via the [front matter](./markdown#front-matter):

\`\`\`yaml
---
theme: [glacier, slate]
---
\`\`\`

Here is a visual overview of the available themes.

## Light mode

<div class="grid grid-cols-2">${renderThemeSection(themes.light)}</div>

## Dark mode

<div class="grid grid-cols-2">${renderThemeSection(themes.dark)}</div>

## Automatic mode

When both a light and a dark mode theme are specified, the dark mode theme will apply only if the user prefers a dark color scheme. This is implemented via [\`prefers-color-scheme\`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme) and typically relies on the user’s operating system settings.

<div class="tip">On macOS, you can create a menubar <a href="https://support.apple.com/guide/shortcuts-mac/intro-to-shortcuts-apdf22b0444c/mac" target="_blank">shortcut</a> to quickly toggle between light and dark mode. This is useful for testing your app in both modes.</div>

<div class="tip">Designing charts that work well in both light and dark mode can be challenging. If you’d prefer to design for only one mode, then set the theme explicitly to <code>light</code> or <code>dark</code>.</div>

## Modifiers

Some themes are designed to be composed with other themes.

The \`alt\` theme swaps the page and card background colors. This brings [cards](./layout/card) to the foreground and is recommended for dashboards.

<div class="grid grid-cols-2">${renderThemeSection(["light-alt", "light", "dark-alt", "dark"])}</div>

The \`wide\` theme removes the maximum width constraint of the main column, which is normally 1152 pixels, allowing it to span the full width of the page. This is recommended for dashboards and is typically combined with \`toc: false\` to disable the table of contents.

<div class="grid grid-cols-1" style="--thumbnail-width: 1600; --thumbnail-height: 720; max-width: 640px;">${renderThemeThumbnail(
    "wide"
  )}</div>

## Aliases

The \`light\` theme is an alias for \`air\`.

The \`dark\` theme is an alias for \`near-midnight\`.

The \`default\` theme is an alias for applying the default light or dark theme, or both. On its own, \`default\` is equivalent to \`[light, dark]\` (or \`[air, near-midnight]\`). The \`default\` theme is applied by default if you don’t specify any color theme. You can also use \`default\` to combine a specific light or dark theme with the default theme of the opposing mode; for example \`[cotton, default]\` is equivalent to \`[cotton, dark]\`, and \`[coffee, default]\` is equivalent to \`[coffee, light]\`.

The \`dashboard\` theme composes the default light and dark themes (\`air\` and \`near-midnight\`) with the \`alt\` and \`wide\` modifiers.

<div class="grid grid-cols-1" style="--thumbnail-width: 1600; --thumbnail-height: 720; max-width: 640px;">${renderThemeThumbnail(
    "dashboard"
  )}</div>
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
    \${resize((width) =>
      Plot.plot({
        title: 'Line graph title',
        subtitle: 'Subtitle goes here',
        x: {label: "X", ticks: 5},
        y: {grid: true, label: "Y", ticks: 4, tickFormat: "s"},
        style: "width: 100%;",
        height: 200,
        width,
        marks: [
          Plot.ruleY([0]),
          Plot.lineY(industriesSubset, {x: "date", y: "unemployed", stroke: "industry", tip: true})
        ]
      }))
    }
  </div>
  <div class="card">
    \${resize((width) =>
      Plot.plot({
        title: 'Bar graph title',
        subtitle: 'Subtitle',
        marginLeft: 75,
        style: "width: 100%;",
        height: 200,
        width,
        x: {domain: [0, 10]},
        marks: [
          Plot.rectX(barData, {x: "Value", y: "Category", fill: "Category"}),
          Plot.ruleX([0])
        ]
      }))
    }
  </div>
</div>`;
}

async function generateFile(path: string, contents: string): Promise<void> {
  console.log(`${faint("generating")} ${path}`);
  await writeFile(path, contents);
}

await generateFile("./docs/themes.md", renderIndex());

for (const theme of themes.light) {
  await generateFile(`./docs/themes/${theme}.md`, renderTheme(theme));
}
for (const theme of themes.dark) {
  await generateFile(`./docs/themes/${theme}.md`, renderTheme(theme));
}

await generateFile("./docs/themes/light.md", renderTheme("light"));
await generateFile("./docs/themes/light-alt.md", renderTheme("[light, alt]"));
await generateFile("./docs/themes/dark.md", renderTheme("dark"));
await generateFile("./docs/themes/dark-alt.md", renderTheme("[dark, alt]"));
await generateFile("./docs/themes/wide.md", renderTheme("wide"));
await generateFile("./docs/themes/dashboard.md", renderTheme("dashboard"));
