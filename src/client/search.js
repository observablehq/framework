// TODO import only when needed
import MiniSearch from "minisearch";

const container = document.querySelector("#observablehq-search");
const base = container.getAttribute("data-root");
const input = container.querySelector("input");
const r = document.querySelector("#observablehq-search-results");
const c = "observablehq-link-active";
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
  if (!value.length) {
    container.parentElement.classList.remove("observablehq-search-results");
    r.innerHTML = "";
    return;
  }
  container.parentElement.classList.add("observablehq-search-results");
  const results = index.search(value, {boost: {title: 4}, fuzzy: 0.15, prefix: true}).slice(0, 11);
  r.innerHTML =
    results.length === 0
      ? "<div>no results</div>"
      : `<div>${results.length === 11 ? "10+" : results.length} result${results.length === 1 ? "" : "s"}</div>
      <ol>${results
        .map(({id, title, score}, i) => {
          score = Math.min(6, Math.round(1 + 0.6 * score));
          return `<li class="observablehq-link${i === 0 ? ` ${c}` : ""}" data-reference="${id}">
        <a href="${base}${id}"><span>${title}</span>
          <small title="score: ${score}; fuzzy matches" data-score="${score}">${"○".repeat(score)}</small>
          </a></li>`;
        })
        .join("")}
      </ol>`;

  if (results.length) {
    const exact_results = index.search(value, {boost: {title: 1}, fuzzy: 0, prefix: false});
    for (const e of exact_results) {
      const p = r.querySelector(`[data-reference='${e.id}'] small`);
      if (p === null) continue;
      const s = +p.getAttribute("data-score");
      const k = Math.round((e.terms.length / value.split(/\W+/).length) * s);
      p.innerHTML = `${"○".repeat(s - k)}${"●".repeat(k)}`;
      p.setAttribute(
        "title",
        `score: ${p.getAttribute("data-score")}; ${k === s ? "exact matches" : "incomplete matches"}`
      );
    }
  }
});

addEventListener("keydown", (event) => {
  const {code, target} = event;
  if (target === input) {
    if (code === "Escape" && input.value === "") {
      input.blur();
      return;
    }
    if (code === "ArrowDown" || code === "ArrowUp" || code === "Enter") {
      const results = document.querySelector("#observablehq-search-results ol");
      const current = results.querySelector(`.${c}`);
      if (!current) return;
      if (code === "Enter") {
        current.querySelector("a")?.click();
      } else {
        if (code === "ArrowUp") {
          current.classList.remove(c);
          (current.previousElementSibling ?? results.querySelector("li:last-child"))?.classList.add(c);
        } else if (code === "ArrowDown") {
          current.classList.remove(c);
          (current.nextElementSibling ?? results.querySelector("li:first-child")).classList.add(c);
        }
      }
    }
  }
});
