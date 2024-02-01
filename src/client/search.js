// TODO import only when needed (input on focus)
import MiniSearch from "npm:minisearch";

const input = document.querySelector("input.observablehq-search");
if (input != null) {
  // TODO: this is gross
  const base = document.querySelector(".observablehq-link a").getAttribute("href"); // e.g., "./" or "../"
  let value;
  const r = document.createElement("div");
  r.setAttribute("id", "observablehq-search-results");
  input.parentElement.appendChild(r);
  const index = {
    _index: undefined,
    _loading: undefined,
    _load() {
      return (
        this._loading ??
        (this._loading = fetch(`${base}_file/data/minisearch.json`)
          .then((resp) => resp.json())
          .then((json) => MiniSearch.loadJS(json, json.options)))
      );
    },
    async search(terms, options) {
      if (!terms) return [];
      if (!this._index) this._index = await this._load();
      return this._index.search(terms, options);
    }
  };
  const search = async (event) => {
    if (value === event.target.value) return;
    sessionStorage.setItem("observablehq-search", (value = event.target.value));
    if (!value.length) {
      input.parentElement.classList.remove("observablehq-search-results");
      r.innerHTML = "";
      return;
    }
    input.parentElement.classList.add("observablehq-search-results");
    const results = await index.search(value, {boost: {title: 4}, fuzzy: 0.2, prefix: true});
    r.innerHTML = results.length === 0 ? "<summary>no results</summary>" : `<details open><summary>${results.length} result${results.length===1 ? "":"s"}</summary><ol>${ results.map(({id, title, score}) => `<li class="observablehq-link"><a href="${base}${id}">${title}</a></li>`).join("")}</ol></details>`;
  };
  input.addEventListener("focus", index._load);
  input.addEventListener("input", search);

  // restore previous search?
  // TODO: this jumps a little
  const prevSearch = sessionStorage.getItem("observablehq-search");
  if (prevSearch?.length) {
    input.value = prevSearch;
    input.dispatchEvent(new Event("input", {bubbles: true}));
  }

  const toggle = document.querySelector("#observablehq-sidebar-toggle");
  addEventListener("keydown", (event) => {
    if (
      event.code === "KeyK" &&
      (event.metaKey || event.altKey) &&
      !event.ctrlKey &&
      (event.target === document.body || event.target === toggle || event.target?.closest("#observablehq-sidebar"))
    ) {
      input.focus();
      toggle.checked = true;
    }
  });
}
