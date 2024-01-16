# Search

```js
import MiniSearch from  "npm:minisearch";

const index = {
  _index: undefined,
  _loading: undefined,
  _load() {
    return this._loading ?? (this._loading = FileAttachment("data/minisearch.json").json()
      .then((json) => MiniSearch.loadJS(json, json.options)));
  },
  async search(terms, options) {
    if (!terms) return [];
    if (!this._index) this._index = await this._load();
    return this._index.search(terms, options);
  }
}
```

```js
const input = document.createElement("input");
input.setAttribute("type", "search");
input.setAttribute("placeholder", "search");
input.setAttribute("required", true);
const search = view(input);
```

```js
const div = document.createElement("ul");
div.className = "search";
const results = await index.search(search, {boost: {title: 4}, fuzzy: 0.2, prefix: true});
for (const result of results) {
  const r = document.createElement("li");
  r.innerHTML = `<a href="${result.id}">${result.title}</a> ${100*result.score|0}`
  div.appendChild(r);
}

// display(index.autoSuggest(search))
// display(results);
display(div);
```

<style>
ul.search li {
  font-size: 0.75em;
}
</style>
