<style>
  .thumbnail {
    position: relative;
    overflow: hidden;
    aspect-ratio: 16/9;
  }

  iframe {
    position: absolute;
    width: 1008px; /* min width to full page with sidebar */
    height: 567px; /* 16/9 aspect ratio */
    border: solid 1px var(--theme-foreground-faintest);
    pointer-events: none;
    -moz-transform: scale(0.5, 0.5);
    -webkit-transform: scale(0.5, 0.5);
    -o-transform: scale(0.5, 0.5);
    -ms-transform: scale(0.5, 0.5);
    transform: scale(0.5, 0.5);
    -moz-transform-origin: top left;
    -webkit-transform-origin: top left;
    -o-transform-origin: top left;
    -ms-transform-origin: top left;
    transform-origin: top left;
  }
</style>


```js
const themes = await FileAttachment("./data/themes.json").json();
```

```js
function themeThumbnail(themePath) {
  return html.fragment`
  <div class="grid-colspan-1 thumbnail">
    <iframe
      class="iframe"
      src="${themePath}">
    </iframe>
  </div>`
}

function section(type) {
  const typeTheme = themes.filter(({type: themeType}) => themeType === type);
  const sectionHtml = [];
  for (let i = 0; i < typeTheme.length; i += 2) {
    sectionHtml.push(html`<div class="grid grid-cols-2"">
    ${themeThumbnail(typeTheme[i]["path"])}
    ${typeTheme[i + 1] && themeThumbnail(typeTheme[i + 1]["path"])}
    </div>`)
  }
  return html`${[...sectionHtml]}`
}
```

## Dark mode

<div>${section("dark")}</div>

## Light mode

<div>${section("light")}</div>

## Layout

<div>${section("layout")}</div>
