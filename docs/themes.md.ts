/* eslint-disable import/no-named-as-default-member */
import {fileURLToPath} from "node:url";
import he from "he";

const light = "air";
const dark = "near-midnight";

export const themes = {
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

export default function render(): string {
  return `---
keywords: [light, dark]
---

# Themes

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

~~~js
for (const card of document.querySelectorAll(".card")) {
  const observer = new ResizeObserver(([entry]) => {
    card.style.setProperty("--container-width", entry.contentRect.width);
  });
  observer.observe(card);
  invalidation?.then(() => observer.disconnect());
}
~~~

Themes affect the visual appearance of pages by specifying colors and fonts, or by augmenting default styles. Framework includes several built-in themes, but you can also design your own themes by specifying a [custom stylesheet](./config#style).

The theme is typically set via the [\`theme\` config option](./config#theme), such as:

~~~js run=false
theme: "cotton"
~~~

You can also apply a theme to an individual page via the [front matter](./markdown#front-matter):

~~~yaml
---
theme: [glacier, slate]
---
~~~

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

<div class="tip">On macOS, you can create a menubar <a href="https://support.apple.com/guide/shortcuts-mac/intro-to-shortcuts-apdf22b0444c/mac">shortcut</a> to quickly toggle between light and dark mode. This is useful for testing.</div>

<div class="tip">Designing charts that work well in both light and dark mode can be challenging. If you’d prefer to design for only one mode, set the theme explicitly to <code>light</code> or <code>dark</code>.</div>

## Modifiers

Theme modifiers are intended to compose with the above color themes. They are:

- \`alt\` - swap the page and card background colors
- \`wide\` - make the main column full-width

The \`alt\` theme swaps the page and card background colors. This brings [cards](./markdown#cards) to the foreground and is recommended for dashboards.

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

On its own, \`default\` is equivalent to \`[light, dark]\` (or \`[${light}, ${dark}]\`). The \`default\` theme is applied by default if you don’t specify any color theme. You can also use \`default\` to combine a specific light or dark theme with the default theme of the opposing mode; for example \`[cotton, default]\` is equivalent to \`[cotton, dark]\`, and \`[coffee, default]\` is equivalent to \`[coffee, light]\`.

## Colors

The following custom properties are defined by the current theme:

<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Color</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>--theme-foreground</code></td>
      <td><div style="background-color: var(--theme-foreground); width: 2rem; height: 1rem;"></div></td>
      <td>page foreground color</td>
    </tr>
    <tr>
      <td><code>--theme-background</code></td>
      <td><div style="background-color: var(--theme-background); width: 2rem; height: 1rem;"></div></td>
      <td>page background color</td>
    </tr>
    <tr>
      <td><code>--theme-background-alt</code></td>
      <td><div style="background-color: var(--theme-background-alt); width: 2rem; height: 1rem;"></div></td>
      <td>block background color</td>
    </tr>
    <tr>
      <td><code>--theme-foreground-alt</code></td>
      <td><div style="background-color: var(--theme-foreground-alt); width: 2rem; height: 1rem;"></div></td>
      <td>heading foreground color</td>
    </tr>
    <tr>
      <td><code>--theme-foreground-muted</code></td>
      <td><div style="background-color: var(--theme-foreground-muted); width: 2rem; height: 1rem;"></div></td>
      <td>secondary text foreground color</td>
    </tr>
    <tr>
      <td><code>--theme-foreground-faint</code></td>
      <td><div style="background-color: var(--theme-foreground-faint); width: 2rem; height: 1rem;"></div></td>
      <td>faint border color</td>
    </tr>
    <tr>
      <td><code>--theme-foreground-fainter</code></td>
      <td><div style="background-color: var(--theme-foreground-fainter); width: 2rem; height: 1rem;"></div></td>
      <td>fainter border color</td>
    </tr>
    <tr>
      <td><code>--theme-foreground-faintest</code></td>
      <td><div style="background-color: var(--theme-foreground-faintest); width: 2rem; height: 1rem;"></div></td>
      <td>faintest border color</td>
    </tr>
    <tr>
      <td><code>--theme-foreground-focus</code></td>
      <td><div style="background-color: var(--theme-foreground-focus); width: 2rem; height: 1rem;"></div></td>
      <td>emphasis foreground color</td>
    </tr>
  </tbody>
</table>

You can use these properties anywhere you like. For example, to style a line chart to match the focus color:

~~~js echo
Plot.lineY(aapl, {x: "Date", y: "Close", stroke: "var(--theme-foreground-focus)"}).plot()
~~~

A handful of color classes are also provided:

~~~html echo
<div class="red">I am red text.</div>
~~~

~~~html echo
<div class="yellow">I am yellow text.</div>
~~~

~~~html echo
<div class="green">I am green text.</div>
~~~

~~~html echo
<div class="blue">I am blue text.</div>
~~~

~~~html echo
<div class="muted">I am muted text.</div>
~~~
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.stdout.write(render());
}
