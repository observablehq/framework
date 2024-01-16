<style>
  .thumbnail {
    width: 100;
  }
</style>

```js
const themes = await FileAttachment("./data/themes.json").json();
display(themes);
```

```js
function themeThumbnail(themePath) {
  return html`<div class="card">
    <iframe
      src="${themePath}">
    </iframe>
  </div>`
}
```

## Dark mode

<div class="grid grid-cols-4">
  ${themes.filter(({type}) => type === "dark").map(({path}) => themeThumbnail(path))}
</div>

## Light mode

<div class="grid grid-cols-4">
  ${themes.filter(({type}) => type === "light").map(({path}) => themeThumbnail(path))}
</div>

## Layout

<div class="grid grid-cols-4">
  ${themes.filter(({type}) => type === "layout").map(({path}) => themeThumbnail(path))}
</div>
