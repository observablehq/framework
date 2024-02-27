import MiniSearch from "minisearch";

const container = document.querySelector("#observablehq-search");
const sidebar = document.querySelector("#observablehq-sidebar");
const shortcut = container.getAttribute("data-shortcut");
const input = container.querySelector("input");
const resultsContainer = document.querySelector("#observablehq-search-results");
const activeClass = "observablehq-link-active";
let currentValue;

const index = await fetch(import.meta.resolve(global.__minisearch))
  .then((response) => {
    if (!response.ok) throw new Error(`unable to load minisearch.json: ${response.status}`);
    return response.json();
  })
  .then((json) =>
    MiniSearch.loadJS(json, {
      ...json.options,
      processTerm: (term) =>
        term
          .slice(0, 15)
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase() // see src/minisearch.json.ts
    })
  );

input.addEventListener("input", () => {
  if (currentValue === input.value) return;
  currentValue = input.value;
  sessionStorage.setItem("search-query", currentValue);
  if (!currentValue.length) {
    container.setAttribute("data-shortcut", shortcut);
    sidebar.classList.remove("observablehq-search-results");
    resultsContainer.innerHTML = "";
    return;
  }
  container.setAttribute("data-shortcut", ""); // prevent conflict with close button
  sidebar.classList.add("observablehq-search-results"); // hide pages while showing search results
  const results = index.search(currentValue, {boost: {title: 4, keywords: 4}, fuzzy: 0.15, prefix: true});
  resultsContainer.innerHTML =
    results.length === 0
      ? "<div>no results</div>"
      : `<div>${results.length.toLocaleString("en-US")} result${
          results.length === 1 ? "" : "s"
        }</div><ol>${renderResults(results)}</ol>`;
  resultsContainer.querySelector(`.${activeClass}`).scrollIntoView({block: "nearest"});
});

function renderResults(results) {
  const me = document.location.href.replace(/[?#].*/, "");
  let found;
  results = results.map(({id, score, title}) => {
    const href = import.meta.resolve(`../${id}`);
    return {
      title: String(title ?? "—"),
      href,
      score: Math.min(5, Math.round(0.6 * score)),
      active: me === href && (found = true)
    };
  });
  if (!found) results[0].active = true;
  return results.map(renderResult).join("");
}

function renderResult({href, score, title, active}) {
  return `<li data-score="${score}" class="observablehq-link${
    active ? ` ${activeClass}` : ""
  }"><a href="${escapeDoubleQuote(href)}">${escapeText(title)}</a></li>`;
}

function escapeDoubleQuote(text) {
  return text.replace(/["&]/g, entity);
}

function escapeText(text) {
  return text.replace(/[<&]/g, entity);
}

function entity(character) {
  return `&#${character.charCodeAt(0).toString()};`;
}

// Handle a race condition where an input event fires while awaiting the index fetch.
input.dispatchEvent(new Event("input"));

input.addEventListener("keydown", (event) => {
  const {code} = event;
  if (code === "Escape" && input.value === "") return input.blur();
  if (code === "ArrowDown" || code === "ArrowUp" || code === "Enter") {
    const results = resultsContainer.querySelector("ol");
    if (!results) return;
    let activeResult = results.querySelector(`.${activeClass}`);
    if (code === "Enter") return activeResult.querySelector("a").click();
    activeResult.classList.remove(activeClass);
    if (code === "ArrowUp") activeResult = activeResult.previousElementSibling ?? results.lastElementChild;
    else activeResult = activeResult.nextElementSibling ?? results.firstElementChild;
    activeResult.classList.add(activeClass);
    activeResult.scrollIntoView({block: "nearest"});
  }
});
