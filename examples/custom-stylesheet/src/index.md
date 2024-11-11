# Custom stylesheet

This [Observable Framework](https://observablehq.com/framework/) project has a custom stylesheet. It’s very blue.

The first part of the stylesheet imports Framework’s default styles. This is essentially a “theme-less” theme that does the layout and typography but doesn’t set any colors.

```css run=false
@import url("observablehq:default.css");
```

Then the stylesheet defines the primary color variables. The `--theme-foreground-alt` variable is used for headings and is typically slightly more muted than the primary foreground color; but here it’s the same color.

```css run=false
:root {
  --theme-foreground: #ffffff;
  --theme-foreground-focus: orange;
  --theme-background: #4751f8;
  --theme-background-alt: #312f2e;
  --theme-foreground-alt: var(--theme-foreground);
}
```

The secondary color variables are derived using [`color-mix`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix). This is a relatively modern CSS feature, but it makes it much more convenient to develop since you can redefine the primary colors and the secondary colors will automatically adjust.

```css run=false
:root {
  --theme-foreground-muted: color-mix(in srgb, var(--theme-foreground) 60%, var(--theme-background));
  --theme-foreground-faint: color-mix(in srgb, var(--theme-foreground) 50%, var(--theme-background));
  --theme-foreground-fainter: color-mix(in srgb, var(--theme-foreground) 30%, var(--theme-background));
  --theme-foreground-faintest: color-mix(in srgb, var(--theme-foreground) 14%, var(--theme-background));
}
```

Our custom stylesheet also needs to define syntax highlighting colors. Here we’ve copied Framework’s default colors for dark-mode highlighting, [`syntax-dark.css`](https://github.com/observablehq/framework/blob/main/src/style/syntax-dark.css).

```css run=false
:root {
  --syntax-keyword: #ff7b72;
  --syntax-entity: #d2a8ff;
  --syntax-constant: #79c0ff;
  --syntax-string: #a5d6ff;
  --syntax-variable: #ffa657;
  --syntax-comment: var(--theme-foreground-muted);
  --syntax-entity-tag: #7ee787;
  --syntax-storage-modifier-import: #c9d1d9;
  --syntax-markup-heading: #1f6feb;
  --syntax-markup-list: #f2cc60;
  --syntax-markup-italic: #c9d1d9;
  --syntax-markup-bold: #c9d1d9;
  --syntax-markup-inserted: #aff5b4;
  --syntax-markup-inserted-background: #033a16;
  --syntax-markup-deleted: #ffdcd7;
  --syntax-markup-deleted-background: #67060c;
}
```

Lastly, there’s a bit of CSS to adopt a sans-serif body font, while keeping a serif font for headings. Oh, and links are underlined.

```css run=false
body {
  font-family: var(--sans-serif);
}

h1,
h2,
h3,
h4,
h5,
h6 {
  font-family: var(--serif);
}

#observablehq-main p a[href] {
  text-decoration: underline;
}
```

And that’s it! Some gibberish follows to demonstrate how text will look.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris sed ligula sed sapien placerat elementum sed in urna. Pellentesque lacinia lacinia pulvinar. Phasellus dignissim erat vitae felis commodo cursus. Integer sit amet consequat neque. Praesent eu nisl eu quam luctus ultricies semper et urna. Proin faucibus leo efficitur leo convallis, gravida efficitur nisl lacinia. Donec sodales felis quis mi ultrices pellentesque. Sed lacinia blandit lorem, vel pretium enim luctus non. Aliquam porttitor non leo id volutpat.

Quisque malesuada, risus quis molestie egestas, purus turpis lobortis ex, sit amet imperdiet leo tellus nec eros.

> _Sed fringilla congue est eget interdum. Mauris hendrerit nulla vitae posuere ornare. Nulla eleifend dictum viverra. In eget eleifend orci, ut congue sapien. Ut blandit efficitur tortor. In felis nisl, mattis ut quam ut, aliquet rutrum odio. Mauris suscipit in dolor eget convallis._

Integer placerat bibendum lorem, et dictum lorem aliquet nec. Aliquam nec condimentum leo. **Donec eu mauris eu elit lacinia malesuada.** Fusce posuere est in ante lobortis, id tempus sapien sodales. Curabitur ante ipsum, fermentum ultrices tortor eu, aliquet porta purus. Praesent hendrerit eget elit vitae sagittis. Donec viverra eros sapien, laoreet molestie orci gravida quis.

Ut at nisl at orci tincidunt dapibus nec vitae risus. Duis lobortis consequat libero sed sollicitudin. Suspendisse iaculis lectus id enim tincidunt congue. Duis consectetur malesuada magna in condimentum. Donec condimentum libero et venenatis vehicula. Fusce eget tristique dui, vel efficitur sem. Nam ut neque varius, hendrerit eros lobortis, tincidunt justo. Aenean et tortor a est suscipit tincidunt at sit amet massa. Pellentesque consectetur mi ac ultrices aliquet. Praesent eget ex et libero molestie condimentum.
