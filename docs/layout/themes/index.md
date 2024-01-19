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

<!-- preload for faster page load-->
${themes.map(({path}) => html`<link rel="preload" href="${path}" as="document"/>`)}

<style>
  .thumbnail {
    position: relative;
    width: 100%;
    max-width: 640px;
    aspect-ratio: 16/9;
    overflow: hidden;
  }

  .thumbnail iframe.wide, .thumbnail iframe.default {
    transform: scale(0.3);
    min-width: calc((640 / 0.3) * 1px);;
    width: 100%;
  }

  .thumbnail iframe {
    position: absolute;
    transform: scale(0.64);
    transform-origin: top left;
    min-width: calc((640 / 0.64) * 1px);
    width: 100%;
    aspect-ratio: 16/9;
    border: transparent 1px;
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
</br>

## Light

<div>${section("light")}</div>
</br>

## Dark

<div>${section("dark")}</div>
</br>

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

</br>

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
