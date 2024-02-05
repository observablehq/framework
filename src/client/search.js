// TODO import only when needed
import MiniSearch from "minisearch";

const container = document.querySelector("#observablehq-search");
const base = container.getAttribute("data-root");
const input = container.querySelector("input");
const r = document.querySelector("#observablehq-search-results");
let value;
const index = await fetch(`${base}_observablehq/minisearch.json`)
  .then((resp) => resp.json())
  .then((json) =>
    MiniSearch.loadJS(json, {
      ...json.options,
      processTerm: (term) => term.slice(0, 15).toLowerCase() // see src/minisearch.json.ts
    })
  );
input.addEventListener("input", (event) => {
  if (value === event.target.value) return;
  value = event.target.value;
  sessionStorage.setItem("observablehq-search-query", value);
  sessionStorage.setItem("observablehq-sidebar:___search_results", "");
  if (!value.length) {
    container.parentElement.classList.remove("observablehq-search-results");
    r.innerHTML = "";
    sessionStorage.setItem("observablehq-search-results", "");
    return;
  }
  container.parentElement.classList.add("observablehq-search-results");
  const results = index.search(value, {boost: {title: 4}, fuzzy: 0.15, prefix: true}).slice(0, 11);
  r.innerHTML =
    results.length === 0
      ? "<summary>no results</summary>"
      : `<details open><summary>${results.length === 11 ? "&gt; 10" : results.length} page${
          results.length === 1 ? "" : "s"
        }</summary>
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
  const d = r.querySelector("details");
  d.ontoggle = () => sessionStorage.setItem("observablehq-sidebar:___search_results", String(d.open));
  sessionStorage.setItem("observablehq-search-results", r.innerHTML);

  const exact_results = index.search(value, {boost: {title: 1}, fuzzy: 0, prefix: false});
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
});
