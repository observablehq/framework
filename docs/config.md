# Configuration

A `observablehq.config.js` (or `observablehq.config.ts`) file located in the project root allows configuration of your project. For example, a site might use a config file to set the project’s title and the sidebar contents:

```js run=false
export default {
  title: "My awesome project",
  pages: [
    {name: "Getting awesome", path: "/getting-awesome"},
    {name: "Being awesome", path: "/being-awesome"},
    {name: "Staying awesome", path: "/staying-awesome"}
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

A theme is a convenient bundle of CSS declarations that define how the project will look like.

The current built-in themes are:
* *auto* - default, chooses *light* or *dark* depending on the user’s system settings
* *light* - light mode
* *dark* - dark mode
* *dashboard* - adds a grid system and full-width pages.

You can combine themes like so:

```js
theme: ["auto", "dashboard"]
```

The theme property is also configurable for a single page by indicating it in the front-matter:

```yaml
---
theme: [auto, dashboard]
---
```

## style

The path to the project’s stylesheet. This is typically set to `style.css` to override or augment the default stylesheet. For example, to create a stylesheet that builds up on the *light* theme, create a `custom-style.css` file in your `docs` folder, and set the **style** configuration option to `"custom-style.css"`:

```css
@import url("observablehq:theme-light.css");
@import url("observablehq:default.css");
#observablehq-main { border: 1px solid red;}
```

The theme property is also configurable for a single page by indicating its relative path in the front-matter:

```yaml
---
style: custom-style.css
---
```

Setting the style property takes precedence over any specified theme.

## style variables

The colors in built-in themes are modifiable with CSS variables. The following variables are supported:

* --theme-foreground - foreground color, _e.g._ black
* --theme-background - background color, _e.g._ white
* --theme-background-alt - alternative background color, _e.g._ light gray
* --theme-foreground-alt - alternative foreground color, used for titles and section titles, _e.g._ brown
* --theme-foreground-muted - muted foreground color, _e.g._ dark gray
* --theme-foreground-faint - faint foreground color, _e.g._ middle gray
* --theme-foreground-fainter - fainter foreground color, _e.g._ light gray
* --theme-foreground-faintest - fainter foreground color, _e.g._ almost white
* --theme-foreground-focus - focus color, _e.g._ blue
* color-scheme - ?

For example to have a default style with custom colors, create a docs/project-style.css file with the following contents, and set the style property to "docs/project-style.css":

```css
@import url("observablehq:theme-light.css");
@import url("observablehq:default.css");
:root {
  --theme-foreground-alt: green; 
}
```

If you build on the *auto* theme, make sure that the color is chosen according to the browser’s preferred-color-scheme.

## title

The project’s title. If specified, this text is used for the link to the home page in the sidebar, and to complement the titles of the webpages. For instance, a page titled “Sales” in a project titled “ACME, Inc.” will display “Sales | ACME, Inc.” in the browser’s title bar. If not specified, the home page link will appear as “Home” in the sidebar, and page titles will be shown as-is.

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
