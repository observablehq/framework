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

  @media (max-width: 640px) {
    :root {
      --scale: 0.375;
      --composition-scale: calc((0.375 / 0.8) * 0.375);
      --width: 300px;
    }
  }

  h2 + div, h3 + div {
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

## Light

<div>${section("light")}</div>

## Dark

<div>${section("dark")}</div>

## Composition
Composition themes are combined with other themes.

### default vs wide
<div>
  <div class="thumbnail">
    <iframe
      class="default"
      scrolling="no"
      src="showcase/default">
    </iframe>
  </div>
  <div class="thumbnail">
    <iframe
      class="wide"
      scrolling="no"
      src="showcase/wide">
    </iframe>
  </div>
</div>

### default vs alt
<div>
  <div class="thumbnail">
    <iframe
      class="default"
      scrolling="no"
      src="showcase/default">
    </iframe>
  </div>
  <div class="thumbnail">
    <iframe
      class="wide"
      scrolling="no"
      src="showcase/alt">
    </iframe>
  </div>
</div>
