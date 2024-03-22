/* eslint-disable import/no-named-as-default-member */
import {writeFile} from "node:fs/promises";
import he from "he";
import {faint} from "../../src/tty.js";

const light = "air";
const dark = "near-midnight";

const themes = {
  light: ["air", "cotton", "glacier", "parchment"],
  dark: ["coffee", "deep-space", "ink", "midnight", "near-midnight", "ocean-floor", "slate", "stark", "sun-faded"]
} as const;

function renderThemeThumbnail(theme: string, attributes: Record<string, string> = {}): string {
  return `<a href="./theme/${theme}" target="_blank" class="card thumbnail">
  <iframe loading="lazy" scrolling="no" src="./theme/${theme}"${Object.entries(attributes)
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

Themes affect the visual appearance of pages by specifying colors and fonts, or by augmenting default styles. Framework includes several built-in themes, but you can also design your own themes by specifying a [custom stylesheet](./config#style).

The theme is typically set via the [\`theme\` config option](./config#theme), such as:

\`\`\`js run=false
theme: "cotton"
\`\`\`

You can also apply a theme to an individual page via the [front matter](./markdown#front-matter):

\`\`\`yaml
---
theme: [glacier, slate]
---
\`\`\`

Here is an overview of the available themes.

## Light mode

The built-in light-mode color themes are:

${themes.light.map((theme) => `- \`${theme}\`${theme === light ? " (default)" : ""}`).join("\n")}

<div class="grid grid-cols-2">${renderThemeSection(themes.light)}</div>

## Dark mode

The built-in dark-mode color themes are:

${themes.dark.map((theme) => `- \`${theme}\`${theme === dark ? " (default)" : ""}`).join("\n")}

<div class="grid grid-cols-2">${renderThemeSection(themes.dark)}</div>

## Auto mode

When both a light and a dark mode theme are specified, theme styles are applied selectively based on the user’s preferred color scheme. This is implemented via [\`prefers-color-scheme\`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme) and typically relies on the user’s operating system settings.

<div class="tip">On macOS, you can create a menubar <a href="https://support.apple.com/guide/shortcuts-mac/intro-to-shortcuts-apdf22b0444c/mac" target="_blank">shortcut</a> to quickly toggle between light and dark mode. This is useful for testing.</div>

<div class="tip">Designing charts that work well in both light and dark mode can be challenging. If you’d prefer to design for only one mode, set the theme explicitly to <code>light</code> or <code>dark</code>.</div>

## Modifiers

Theme modifiers are intended to compose with the above color themes. They are:

- \`alt\` - swap the page and card background colors
- \`wide\` - make the main column full-width

The \`alt\` theme swaps the page and card background colors. This brings [cards](./css/card) to the foreground and is recommended for dashboards.

<div class="grid grid-cols-2">${renderThemeSection(["light-alt", "light", "dark-alt", "dark"])}</div>

The \`wide\` theme removes the maximum width constraint of the main column, which is normally 1152 pixels, allowing it to span the full width of the page. This is recommended for dashboards and is typically combined with the \`alt\` theme modifier and \`toc: false\` to disable the table of contents.

<div class="grid grid-cols-1" style="--thumbnail-width: 1600; --thumbnail-height: 800; max-width: 640px;">${renderThemeThumbnail(
    "wide"
  )}</div>

The \`dashboard\` [theme alias](#aliases) composes the default light and dark themes (\`${light}\` and \`${dark}\`) with the \`alt\` and \`wide\` modifiers. On its own, \`dashboard\` is equivalent to \`[light, dark, alt, wide]\`.

<div class="grid grid-cols-1" style="--thumbnail-width: 1600; --thumbnail-height: 800; max-width: 640px;">${renderThemeThumbnail(
    "dashboard"
  )}</div>

## Aliases

In addition to themes and theme modifiers, there are special aliases:

- \`default\` - either \`light\` or \`dark\` depending on user preference
- \`dashboard\` - \`[light, dark]\` if needed, plus \`alt\` and \`wide\`
- \`light\` - an alias for \`${light}\`
- \`dark\` - an alias for \`${dark}\`

On its own, \`default\` is equivalent to \`[light, dark]\` (or \`[${light}, ${dark}]\`). The \`default\` theme is applied by default if you don’t specify any color theme. You can also use \`default\` to combine a specific light or dark theme with the default theme of the opposing mode; for example \`[cotton, default]\` is equivalent to \`[cotton, dark]\`, and \`[coffee, default]\` is equivalent to \`[coffee, light]\`.`;
}

function renderTheme(theme: string): string {
  return `---
theme: ${theme}
toc: false
head: false
header: false
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
## A preview of the \`${theme}\` [theme](../themes)

<div class="grid grid-cols-2">
  <div class="card">\${
    resize((width) => Plot.plot({
      title: "Construction unemployment reaches record high",
      subtitle: "And it’s not just seasonal variation",
      y: {grid: true, transform: (d) => d * 1000},
      color: {range: ["var(--theme-foreground-fainter)", "var(--theme-foreground-focus)"]},
      height: 320,
      width,
      marks: [
        Plot.ruleY([0]),
        Plot.axisY({label: "Unemployed (millions)", tickFormat: (d) => (d / 1e6).toFixed(1)}),
        Plot.lineY(industries, {x: "date", y: "unemployed", z: "industry", stroke: "var(--theme-foreground-fainter)", strokeWidth: 1}),
        Plot.lineY(industries, {x: "date", y: "unemployed", filter: (d) => d.industry === industry, stroke: "var(--theme-foreground-focus)", tip: true})
      ]
    }))
  }</div>
  <div class="card">\${
    resize((width) => Plot.plot({
      title: "Vowels are some of the most frequent letters in English",
      x: {grid: true, percent: true},
      marginTop: 0,
      color: {domain: "AEIOUY", unknown: "var(--theme-foreground-fainter)", legend: true},
      height: 300,
      width,
      marks: [
        Plot.rectX(alphabet, {x: "frequency", y: "letter", fill: (d) => /[aeiouy]/i.test(d.letter) ? d.letter : "other", sort: {y: "-x"}, tip: {format: {x: true, y: true}}}),
        Plot.ruleX([0])
      ]
    }))
  }</div>
</div>

\`\`\`js
const industry = view(Inputs.select(industries.map((d) => d.industry), {unique: true, sort: true, label: "Industry", value: "Construction"}));
\`\`\`

Call me Ishmael. Some years ago — never mind how long precisely — having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world. It is a way I have of driving off the spleen and regulating the circulation.

\`\`\`js
Inputs.table(penguins)
\`\`\`

Whenever I find myself growing grim about the mouth; whenever it is a damp, drizzly November in my soul; whenever I find myself involuntarily pausing before coffin warehouses, and bringing up the rear of every funeral I meet; and especially whenever my hypos get such an upper hand of me, that it requires a strong moral principle to prevent me from deliberately stepping into the street, and methodically knocking people’s hats off — then, I account it high time to get to sea as soon as I can. This is my substitute for pistol and ball. With a philosophical flourish Cato throws himself upon his sword; I quietly take to the ship.

There is nothing surprising in this. If they but knew it, almost all men in their degree, some time or other, cherish very nearly the same feelings towards the ocean with me.`;
}

async function generateFile(path: string, contents: string): Promise<void> {
  console.log(`${faint("generating")} ${path}`);
  await writeFile(path, contents);
}

await generateFile("./docs/themes.md", renderIndex());

for (const theme of themes.light) {
  await generateFile(`./docs/theme/${theme}.md`, renderTheme(theme));
}
for (const theme of themes.dark) {
  await generateFile(`./docs/theme/${theme}.md`, renderTheme(theme));
}

await generateFile("./docs/theme/light.md", renderTheme("light"));
await generateFile("./docs/theme/light-alt.md", renderTheme("[light, alt]"));
await generateFile("./docs/theme/dark.md", renderTheme("dark"));
await generateFile("./docs/theme/dark-alt.md", renderTheme("[dark, alt]"));
await generateFile("./docs/theme/wide.md", renderTheme("wide"));
await generateFile("./docs/theme/dashboard.md", renderTheme("dashboard"));
