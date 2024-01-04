# Styles


The default stylesheet is defined as:

```css
@import url("observablehq:mode-auto.css");
@import url("observablehq:default.css");
```

The first line imports the built-in `mode-auto.css` stylesheet, which toggles the colors based on the user’s system preference of light mode vs. dark mode. To always use the light mode, change the first line to:

```css
@import url("observablehq:mode-light.css");
```

(and conversely `mode-dark.css` to force dark mode).

The second line imports the built-in `default.css` which in turn imports thematic stylesheets:

```css
@import url("./global.css");
@import url("./layout.css");
@import url("./inspector.css");
@import url("./inputs.css");
@import url("./plot.css");
```

While you can replace or remove any or all of these files in your own stylesheet, it is often simpler to either start from scratch (import your own design directly and ignore the built-ins), or to use the built-in and augment them marginally with additional rules and variables.

## Variables

TK list available variables.

## Themes

TK.