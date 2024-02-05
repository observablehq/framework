const container = document.querySelector("#observablehq-search")!;

const input = container.querySelector("input")! as HTMLInputElement;
input.setAttribute("placeholder", `Search pages… ${/Mac|iPhone/.test(navigator.platform) ? "⌘" : "Alt-"}K`);
input.value = sessionStorage.getItem("observablehq-search-query") ?? "";
const prevResults = sessionStorage.getItem("observablehq-search-results");
if (prevResults) {
  document.querySelector("#observablehq-search-results")!.innerHTML = prevResults;
  container.parentElement?.classList.add("observablehq-search-results");
}

// fix links relative to the base
const base = document.querySelector("#observablehq-search")?.getAttribute("data-root");
for (const link of document.querySelectorAll("#observablehq-search-results a")) {
  link.setAttribute("href", `${base}${link.parentElement?.getAttribute("data-reference")}`);
}

// retain open/close status
const details = document.querySelector("#observablehq-search-results details");
if (details && sessionStorage.getItem("observablehq-sidebar:___search_results") === "false")
  details.removeAttribute("open");

// load search.js on demand
function load() {
  input.removeEventListener("focus", load);
  input.removeEventListener("keydown", load);
  const s = document.createElement("script");
  s.setAttribute("type", "module");
  s.setAttribute("src", `${base}_observablehq/search.js`);
  container.appendChild(s);
}
input.addEventListener("focus", load);
input.addEventListener("keydown", load);

// Focus on meta-K
const toggle = document.querySelector("#observablehq-sidebar-toggle")! as HTMLInputElement;
addEventListener("keydown", (event) => {
  if (event.code === "KeyK" && event.metaKey && !event.altKey && !event.ctrlKey) {
    if (input.getBoundingClientRect().x < 0) toggle.click();
    input.focus();
    input.select();
    event.preventDefault();
  }
});
