// TODO import only when needed
import MiniSearch from "npm:minisearch";

const nav = document.querySelector("#observablehq-sidebar");
if (nav != null) {
  // TODO: this is gross
  const base = document.querySelector(".observablehq-link a").getAttribute("href"); // e.g., "./" or "../"

  const input = document.createElement("input");
  input.setAttribute("class", "observablehq-search");
  input.setAttribute("type", "search");
  input.setAttribute(
    "placeholder",
    `Search pages… ${
      /Mac|iPhone/.test(navigator.platform)
        ? "⌘" // command symbol for mac
        : "Alt-" // for other os
    }K`
  );
  nav.insertBefore(input, nav.firstChild);

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
    const results = await index.search(value, {boost: {title: 4}, fuzzy: 0.15, prefix: true});
    r.innerHTML =
      results.length === 0
        ? "<summary>no results</summary>"
        : `<details open><summary>${results.length} page${results.length === 1 ? "" : "s"}</summary>
      <ol>${results
        .map(({id, title, score}) => {
          score = Math.min(6, Math.round(1 + 0.6 * score));
          return `<li class="observablehq-link" data-reference="${id}">
        <a href="${base}${id}">${title}
          <small
            title="score: ${score}; fuzzy matches"
            style="position: absolute; right: 15px; font-size: 0.4rem; margin-top: 0.5em;" data-score="${score}">${"○".repeat(
              score
            )}</small>
          </a></li>`;
        })
        .join("")}
      </ol>
    </details>`;

    const exact_results = await index.search(value, {boost: {title: 1}, fuzzy: 0, prefix: false});
    for (const e of exact_results) {
      const p = r.querySelector(`[data-reference='${e.id}'] small`);
      const s = +p.getAttribute("data-score");
      const k = Math.round((e.terms.length / value.split(/\W+/).length) * s);
      p.innerHTML = `${"○".repeat(s - k)}${"●".repeat(k)}`;
      p.setAttribute(
        "title",
        `score: ${p.getAttribute("data-score")}; ${k === s ? "exact matches" : "incomplete matches"}`
      );
    }
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
    if (event.code === "KeyK" && event.metaKey && !event.altKey && !event.ctrlKey) {
      toggle.checked = true;
      input.focus();
      event.preventDefault();
    }
  });
}
