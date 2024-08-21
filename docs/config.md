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

The path to the source root; defaults to `src`. (Prior to <a href="https://github.com/observablehq/framework/releases/tag/v1.7.0" class="observablehq-version-badge" data-version="^1.7.0" title="Added in 1.7.0"></a>, the default was `docs`.)

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

The path to a custom stylesheet, relative to the source root (typically `src`). This option takes precedence over the [theme option](#theme) (if any), providing more control by allowing you to remove or alter the default stylesheet and define a custom theme.

The custom stylesheet should typically import `observablehq:default.css` to build on the default styles. You can also import any of the built-in themes. For example, to create a stylesheet that builds up on the `air` theme, create a `custom-style.css` file in the source root, then set the style option to `custom-style.css`:

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

An array containing pages and sections. If not specified, it defaults to all Markdown files found in the source root in directory listing order.

Both pages and sections have a **name**, which typically corresponds to the page’s title. The name gets displayed in the sidebar. Sections are used to group related pages; each section must specify an array of **pages**. (Sections can only contain pages; nested sections are not currently supported.)

Clicking on a page in the sidebar navigates to the corresponding **path**, which should start with a leading slash and be relative to the root; the path can also be specified as a full URL to navigate to an external site. A section may specify a **path** <a href="https://github.com/observablehq/framework/releases/tag/v1.8.0" class="observablehq-version-badge" data-version="^1.8.0" title="Added in 1.8.0"></a> to navigate to when the section header is clicked; if a section does not specify a **path**, then clicking the section header toggles the section (if **collapsible**; see below).

For example, here **pages** specifies two sections and a total of five pages:

```js run=false
export default {
  pages: [
    {
      name: "Section 1",
      path: "/s01/",
      pages: [
        {name: "Page 1", path: "/s01/page1"},
        {name: "Page 2", path: "/s01/page2"}
      ]
    },
    {
      name: "Section 2",
      open: false,
      pages: [
        {name: "Page 3", path: "/s02/page3"},
        {name: "Page 4", path: "/s02/page4"}
      ]
    }
  ]
}
```

Sections may be **collapsible**. <a href="https://github.com/observablehq/framework/releases/tag/v1.6.0" class="observablehq-version-badge" data-version="^1.6.0" title="Added in 1.6.0"></a> If the **open** option is set, the **collapsible** option defaults to true; otherwise it defaults to false. If the section is not collapsible, the **open** option is ignored and the section is always open; otherwise, the **open** option defaults to true. A section will open automatically if the current page belongs to that section.

Pages and sections may also have a **pager** field <a href="https://github.com/observablehq/framework/releases/tag/v1.8.0" class="observablehq-version-badge" data-version="^1.8.0" title="Added in 1.8.0"></a> which specifies the name of the page group; this determines which pages are linked to via the previous and next pager buttons. If the **pager** field is not specified, it defaults the current section’s **pager** field, or to `main` for top-level pages and sections. (The home page is always in the `main` pager group.) The **pager** field can be also set to `null` to disable the pager on a specific page or section, causing adjacent pages to skip the page.

Projects can have “unlisted” pages that are not referenced in **pages**. These pages can still be linked from other pages or visited directly, but they won’t be listed in the sidebar or linked to via the previous & next pager links.

The pages list should _not_ include the home page (`/`) as this is automatically linked at the top of the sidebar. We also do not recommend listing the same page multiple times (say with different query parameters or anchor fragments), as this causes the previous & next pager links to cycle.

## pager

Whether to show the previous & next links in the footer; defaults to true. The pages are linked in the same order as they appear in the sidebar.

## head

An HTML fragment to add to the head. Defaults to the empty string. If specified as a function, receives an object with the page’s `title`, (front-matter) `data`, and `path`, and must return a string.

## header

An HTML fragment to add to the header. Defaults to the empty string. If specified as a function, receives an object with the page’s `title`, (front-matter) `data`, and `path`, and must return a string.

## footer

An HTML fragment to add to the footer. Defaults to “Built with Observable.” If specified as a function, receives an object with the page’s `title`, (front-matter) `data`, and `path`, and must return a string.

For example, the following adds a link to the bottom of each page:

```js run=false
footer: ({path}) => `<a href="https://github.com/example/test/blob/main/src${path}.md?plain=1">view source</a>`,
```

## base

The base path when serving the site. Currently this only affects the custom 404 page, if any.

## cleanUrls <a href="https://github.com/observablehq/framework/releases/tag/v1.3.0" class="observablehq-version-badge" data-version="^1.3.0" title="Added in 1.3.0"></a>

Whether page links should be “clean”, _i.e._, formatted without a `.html` extension. Defaults to true. If true, a link to `config.html` will be formatted as `config`. Regardless of this setting, a link to an index page will drop the implied `index.html`; for example `foo/index.html` will be formatted as `foo/`.

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

If true, enable [search](./search) on the project; defaults to false. The **search** option may also be specified as an object with an **index** method <a href="https://github.com/observablehq/framework/releases/tag/v1.9.0" class="observablehq-version-badge" data-version="^1.9.0" title="Added in 1.9.0"></a>, in which case additional results can be added to the search index. Each result is specified as:

```ts run=false
interface SearchResult {
  path: string;
  title: string | null;
  text: string;
  keywords?: string;
}
```

These additional results may also point to external links if the **path** is specified as an absolute URL. For example:

```js run=false
export default {
  search: {
    async* index() {
      yield {
        path: "https://example.com",
        title: "Example",
        text: "This is an example of an external link."
      };
    }
  }
};
```

## interpreters <a href="https://github.com/observablehq/framework/releases/tag/v1.3.0" class="observablehq-version-badge" data-version="^1.3.0" title="Added in 1.3.0"></a>

The **interpreters** option specifies additional interpreted languages for data loaders, indicating the file extension and associated interpreter. (See [loader routing](./loaders#routing) for more.) The default list of interpreters is:

```js run=false
{
  ".js": ["node", "--no-warnings=ExperimentalWarning"],
  ".ts": ["tsx"],
  ".py": ["python3"],
  ".r": ["Rscript"],
  ".R": ["Rscript"],
  ".rs": ["rust-script"]
  ".go": ["go", "run"],
  ".java": ["java"],
  ".jl": ["julia"],
  ".php": ["php"],
  ".sh": ["sh"],
  ".exe": []
}
```

Keys specify the file extension and values the associated command and arguments. For example, to add Perl (extension `.pl`) and AppleScript (`.scpt`) to the list above:

```js run=false
export default {
  interpreters: {
    ".pl": ["perl"],
    ".scpt": ["osascript"]
  }
};
```

To disable an interpreter, set its value to null. For example, to disable Rust:

```js run=false
export default {
  interpreters: {
    ".rs": null
  }
};
```

## markdownIt <a href="https://github.com/observablehq/framework/releases/tag/v1.1.0" class="observablehq-version-badge" data-version="^1.1.0" title="Added in v1.1.0"></a>

A hook for registering additional [markdown-it](https://github.com/markdown-it/markdown-it) plugins. For example, to use [markdown-it-footnote](https://github.com/markdown-it/markdown-it-footnote), first install the plugin with either `npm add markdown-it-footnote` or `yarn add markdown-it-footnote`, then register it like so:

```js run=false
import MarkdownItFootnote from "markdown-it-footnote";

export default {
  markdownIt: (md) => md.use(MarkdownItFootnote)
};
```

## typographer <a href="https://github.com/observablehq/framework/releases/tag/v1.7.0" class="observablehq-version-badge" data-version="^1.7.0" title="Added in 1.7.0"></a>

If true, enables simple typographic replacements in Markdown, such as replacing `(c)` with `©` and converting straight quotes to curly quotes. See also the [quotes](#quotes) option, which should be set for non-English languages if the **typographer** option is enabled. For the full list of replacements, see [markdown-it](https://github.com/markdown-it/markdown-it/blob/master/lib/rules_core/replacements.mjs). Defaults to false.

## quotes <a href="https://github.com/observablehq/framework/releases/tag/v1.7.0" class="observablehq-version-badge" data-version="^1.7.0" title="Added in 1.7.0"></a>

The set of replacements for straight double and single quotes used when the [**typographer** option](#typographer) is enabled. Defaults to `["“", "”", "‘", "’"]` which is suitable for English. For example, you can use `["«", "»", "„", "“"]` for Russian, `["„", "“", "‚", "‘"]` for German, and `["«\xa0", "\xa0»", "‹\xa0", "\xa0›"]` for French.

## linkify <a href="https://github.com/observablehq/framework/releases/tag/v1.7.0" class="observablehq-version-badge" data-version="^1.7.0" title="Added in 1.7.0"></a>

If true (the default), automatically convert URL-like text to links in Markdown.
