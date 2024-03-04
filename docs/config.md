# Configuration

A `observablehq.config.js` (or `observablehq.config.ts`) file located in the project root allows configuration of your project. For example, a site might use a config file to set the project’s title and the sidebar contents:

```js run=false
export default {
  title: "My awesome project",
  pages: [
    {name: "Getting ever more awesome", path: "/getting-awesome"},
    {name: "Being totally awesome", path: "/being-awesome"},
    {name: "Staying as awesome as ever", path: "/staying-awesome"}
  ]
};
```

Configuration files are optional. Any options you don’t specify will use the default values described below.

Configuration files are code. This means they can be dynamic, for example referencing environment variables. The configuration is effectively baked-in to the generated static site at build time. During preview, you must restart the preview server for changes to the configuration file to take effect.

The following options are supported.

## root

The path to the source root; defaults to `docs`.

## output

The path to the output root; defaults to `dist`.

## theme

The theme name or names, if any; defaults to `default`. [Themes](./themes) affect visual appearance by specifying colors and fonts, or by augmenting default styles. The theme option is a shorthand alternative to specifying a [custom stylesheet](#style).

To force light mode:

```js run=false
theme: "light"
```

To force dark mode:

```js run=false
theme: "dark"
```

For dashboards, to compose the default light and dark themes with `alt` and `wide`:

```js run=false
theme: "dashboard"
```

Or more explicitly:

```js run=false
theme: ["air", "near-midnight", "alt", "wide"]
```

You can also apply a theme to an individual page via the [front matter](./markdown#front-matter):

```yaml
---
theme: [glacier, slate]
---
```

See the [list of available themes](./themes) for more.

## style

The path to a custom stylesheet, relative to the source root. This option takes precedence over the [theme option](#theme) (if any), providing more control by allowing you to remove or alter the default stylesheet and define a custom theme.

The custom stylesheet should typically import `observablehq:default.css` to build on the default styles. You can also import any of the built-in themes. For example, to create a stylesheet that builds up on the `air` theme, create a `custom-style.css` file in the `docs` folder, then set the style option to `custom-style.css`:

```css
@import url("observablehq:default.css");
@import url("observablehq:theme-air.css");

:root {
  --theme-foreground-focus: green;
}
```

The default styles are implemented using CSS custom properties. These properties are designed to be defined by themes or custom stylesheets. The following custom properties are supported:

- `--theme-foreground` - page foreground color, _e.g._ black
- `--theme-background` - page background color, _e.g._ white
- `--theme-background-alt` - block background color, _e.g._ light gray
- `--theme-foreground-alt` - heading foreground color, _e.g._ brown
- `--theme-foreground-muted` - secondary text foreground color, _e.g._ dark gray
- `--theme-foreground-faint` - faint border color, _e.g._ middle gray
- `--theme-foreground-fainter` - fainter border color, _e.g._ light gray
- `--theme-foreground-faintest` - faintest border color, _e.g._ almost white
- `--theme-foreground-focus` - emphasis foreground color, _e.g._ blue

A custom stylesheet can be applied to an individual page via the [front matter](./markdown#front-matter):

```yaml
---
style: custom-style.css
---
```

In this case, the path to the stylesheet is resolved relative to the page’s Markdown file rather than the source root.

## title

The project’s title. If specified, this text is used for the link to the home page in the sidebar, and to complement the titles of the webpages. For instance, a page titled “Sales” in a project titled “ACME, Inc.” will display “Sales | ACME, Inc.” in the browser’s title bar. If not specified, the home page link will appear as “Home” in the sidebar, and page titles will be shown as-is.

## sidebar

Whether to show the sidebar. Defaults to true if **pages** is not empty.

## pages

An array containing pages and/or sections. If not specified, it defaults to all Markdown files found in the source root in directory listing order.

The following TypeScript interfaces describe pages and sections:

```ts run=false
export interface Page {
  name: string;
  path: string;
}
```

```ts run=false
export interface Section {
  name: string;
  pages: Page[];
  open?: boolean;
}
```

If a section’s **open** option is not set, it defaults to true.

Projects can have “unlisted” pages that are not included in the pages list. These pages will still be accessible if linked from other pages or visited directly, but they won’t be listed in the sidebar or linked to via the previous & next footer.

The pages list should _not_ include the root page, `index.md`. Also, we don’t recommend using query strings or anchor fragments, as these will prevent the previous & next footer links from navigating.

## pager

Whether to show the previous & next footer links; defaults to true.

## head

An HTML fragment to add to the head. Defaults to the empty string.

## header

An HTML fragment to add to the header. Defaults to the empty string.

## footer

An HTML fragment to add to the footer. Defaults to “Built with Observable.”

## scripts

Additional scripts to add to the head, such as for analytics. Unlike the **head** option, this allows you to reference a local script in the source root.

```js run=false
export default {
  scripts: [{type: "module", async: true, src: "analytics.js"}]
};
```

## base

The base path when serving the site. Currently this only affects the custom 404 page, if any.

## toc

The table of contents configuration.

The following TypeScript interface describes this option:

```ts run=false
export interface TableOfContents {
  show?: boolean;
  label?: string;
}
```

If **show** is not set, it defaults to true. If **label** is not set, it defaults to “Contents”. The **toc** option can also be set to a boolean, in which case it is shorthand for **toc.show**.

If shown, the table of contents enumerates the second-level headings (H2 elements, such as `## Section name`) on the right-hand side of the page. The currently-shown section is highlighted in the table of contents.

The table of contents configuration can also be set in the page’s YAML front matter. The page-level configuration takes precedence over the project-level configuration. For example, to disable the table of contents on a particular page:

```yaml
---
toc: false
---
```

## search

Whether to enable [search](./search) on the project; defaults to false.

## markdownIt

A hook for registering additional [markdown-it](https://github.com/markdown-it/markdown-it) plugins. For example, to use [markdown-it-footnote](https://github.com/markdown-it/markdown-it-footnote):

```js run=false
import type MarkdownIt from "markdown-it";
import MarkdownItFootnote from "markdown-it-footnote";

export default {
  markdownIt: (md: MarkdownIt) => md.use(MarkdownItFootnote);
};
```
