# Styles

The default stylesheet is defined as:

```css
@import url("observablehq:scheme-auto.css");
@import url("observablehq:default.css");
```

The first line imports the built-in `scheme-auto.css` stylesheet, which toggles the colors based on the user’s system preference of light vs. dark color schemes (a.k.a., “dark mode”). To only use the light scheme, edit `docs/style.css` and change the first line to:

```css
@import url("observablehq:scheme-light.css");
```

(conversely change it to `scheme-dark.css` to always use dark mode).

The second line imports the built-in `default.css` which contains rules that govern the colors, the page layout, style how values are [displayed](javascript/display), etc.

While you can replace or remove any of these files in your own stylesheet, it is often simpler to either start from scratch (import your own designs directly and ignore the built-ins), or use the built-in and augment them marginally with additional rules and variables.

## Variables

TK list available variables.

## Themes

The configuration can define themes (modifications or replacements of the default style.css), that a page can then use by specifying the desired theme in its front-matter:

```yaml
---
theme: special
---
```

A theme is defined in the configuration as the value of the themes object, with the theme name as key. The value is an object that specifies the stylesheet:

```json
themes: {
  special: {style: "docs/special.css"}
}
```

You can define as many themes as you want. As soon as one page in the project calls a given theme, the corresponding stylesheet will be built (and optimized with [rollup](https://rollupjs.org/)) as `_observable/{theme}.css`.
