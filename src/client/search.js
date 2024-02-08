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
input.onblur = () => setTimeout(() => sessionStorage.removeItem("observablehq-search-focus"), 100);
input.addEventListener("input", (event) => {
  if (value === event.target.value) return;
  value = event.target.value;
  sessionStorage.setItem("observablehq-search-query", value);
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
      ? "<div>no results<//div"
      : `<div>${results.length === 11 ? "&gt; 10" : results.length} page${results.length === 1 ? "" : "s"}</div>
      <ol>${results
        .map(({id, title, score}, i) => {
          score = Math.min(6, Math.round(1 + 0.6 * score));
          return `<li class="observablehq-link${i === 0 ? ` ${c}` : ""}" data-reference="${id}">
        <a href="${base}${id}">${title}
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
  sessionStorage.setItem("observablehq-search-results", r.innerHTML);
});

addEventListener("keydown", (event) => {
  const {code, target} = event;
  if (target === input) {
    if (code === "ArrowDown" || code === "ArrowUp" || code === "Enter" || (code === "Escape" && input.value === "")) {
      const current = document.querySelector(`#observablehq-search-results li.${c}`);
      if (code === "Escape") {
        input.blur();
      } else if (code === "Enter") {
        if (current) {
          sessionStorage.setItem("observablehq-search-focus", current.getAttribute("data-reference"));
          current.querySelector("a")?.click();
        }
      } else {
        if (code === "ArrowUp") {
          if (current) {
            current.classList.remove(c);
            current.previousElementSibling?.classList.add(c);
          } else document.querySelector("#observablehq-search-results li:last-child")?.classList.add(c);
        } else if (code === "ArrowDown") {
          if (current) {
            current.classList.remove(c);
            current.nextElementSibling?.classList.add(c);
          } else document.querySelector("#observablehq-search-results li:first-child")?.classList.add(c);
        }
      }
      event.preventDefault();
    }
  }
});
