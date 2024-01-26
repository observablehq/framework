```js
const themes = await FileAttachment("./data/themes.json").json();
```

```js
function themeThumbnail(themePath, classes = []) {
  return html.fragment`
  <div class="thumbnail">
    <iframe
      scrolling="no"
      src="${themePath}">
    </iframe>
  </div>`
}

function section(type) {
  const typeTheme = themes.filter(({type: themeType}) => themeType === type);
  return html`${typeTheme.map((theme) => themeThumbnail(theme["path"]))}`
}
```

<style>
  :root {
    --scale: 0.8;
    --composition-scale: 0.375;
    --width: 640px;
  }

  @media (max-width: calc(2rem + 640px + 2rem)) {
    :root {
      --scale: calc(0.8 * 0.75);
      --composition-scale: calc(var(--scale) * (0.375 / 0.8));
      --width: calc((2rem + 640px + 2rem) * 0.75);
    }
  }

  @media (max-width: calc(2rem + 530px + 2rem)) {
    :root {
      --scale: calc(0.8 * 0.5);
      --composition-scale: calc(var(--scale) * (0.375 / 0.8));
      --width: calc((2rem + 530px + 2rem) * 0.5);
    }
  }

  h2 + div, h3 + div, h3 + p + div {
    margin-bottom: 1rem;
  }

  .thumbnail {
    position: relative;
    width: 100%;
    max-width: var(--width);
    aspect-ratio: 16/9;
    overflow: hidden;
  }

  .thumbnail iframe.wide, .thumbnail iframe.default {
    transform: scale(var(--composition-scale));
    min-width: calc(var(--width) / var(--composition-scale));;
    width: 100%;
  }

  .thumbnail iframe {
    position: absolute;
    transform: scale(var(--scale));
    transform-origin: top left;
    min-width: calc(var(--width) / var(--scale));
    max-height: calc((var(--width) / var(--scale)) * 1.5);
    width: 100%;
    border: transparent 1px;
    aspect-ratio: 16/9;
    pointer-events: none;
  }
</style>

# Themes

This gallery provides a visual overview of the themes described in the [Configuration](../../config) section — where you can also read more about customizing the appearance of your projects with custom stylesheets.

You can set themes for a project in the project configuration or in the page front matter like so:

```yaml
---
theme: [glacier, slate]
---
```

Specify both a light and a dark theme to allow your project to detect if a user has requested light or dark color themes.

## Light themes

<div>${section("light")}</div>

## Dark themes

<div>${section("dark")}</div>

## Variants

The following themes are composed with color themes.

The `alt` theme swaps the page and card background colors.

<div>
  <div class="thumbnail">
    <iframe
      scrolling="no"
      src="showcase/alt">
    </iframe>
  </div>
</div>

The `wide` theme sets the width of the main column to the full width of the page.

<div>
  <div class="thumbnail" style="margin-top: 8px">
    <iframe
      class="wide"
      scrolling="no"
      src="showcase/wide">
    </iframe>
  </div>
</div>

The `dashboard` theme composes the default light and dark themes (`air` and `near-midnight`) together with `alt` and `wide`.

<div>
  <div class="thumbnail">
    <iframe
      class="wide"
      scrolling="no"
      src="showcase/dashboard">
    </iframe>
  </div>
</div>
