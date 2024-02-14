// eslint-disable-next-line import/no-relative-packages
import MiniSearch from "../../node_modules/minisearch";

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
input.addEventListener("input", () => {
  if (value === input.value) return;
  value = input.value;
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
      : `<div>${results.length === 11 ? "10+" : results.length} result${
          results.length === 1 ? "" : "s"
        }</div><ol>${"<li><a></a></li>".repeat(results.length)}</ol>`;
  r.querySelectorAll("li").forEach((li, i) => {
    const {id, score, title} = results[i];
    li.setAttribute("class", `observablehq-link${i === 0 ? ` ${c}` : ""}`);
    li.setAttribute("data-reference", id);
    li.setAttribute("data-score", Math.min(5, Math.round(0.6 * score)));
    const a = li.firstChild;
    a.setAttribute("href", `${base}${id}`);
    a.textContent = title;
  });
});

// Handle a race condition where an input event fires while awaiting the index fetch.
input.dispatchEvent(new Event("input"));

addEventListener("keydown", (event) => {
  const {code, target} = event;
  if (target === input) {
    if (code === "Escape" && input.value === "") {
      input.blur();
      return;
    }
    if (code === "ArrowDown" || code === "ArrowUp" || code === "Enter") {
      const results = r.querySelector("ol");
      const current = results?.querySelector(`.${c}`);
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
