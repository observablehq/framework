const container = document.querySelector("#observablehq-search")!;

const input = container.querySelector("input")! as HTMLInputElement;
input.setAttribute("placeholder", `Search pages… ${/Mac|iPhone/.test(navigator.platform) ? "⌘" : "Alt-"}K`);
input.value = sessionStorage.getItem("observablehq-search-query") ?? "";
const prevResults = sessionStorage.getItem("observablehq-search-results");
if (prevResults) {
  const r = document.querySelector("#observablehq-search-results");
  if (r) {
    r.innerHTML = prevResults;
    const f = sessionStorage.getItem("observablehq-search-focus");
    for (const li of r.querySelectorAll("li")) {
      if (li.getAttribute("data-reference") === f) li.classList.add("observablehq-link-active");
      else li.classList.remove("observablehq-link-active");
    }
    if (f) {
      sessionStorage.removeItem("observablehq-search-focus");
      setTimeout(() => input.focus(), 10);
    }
  }
  container.parentElement?.classList.add("observablehq-search-results");
}

// fix links relative to the base
const base = document.querySelector("#observablehq-search")?.getAttribute("data-root");
for (const link of document.querySelectorAll("#observablehq-search-results a")) {
  link.setAttribute("href", `${base}${link.parentElement?.getAttribute("data-reference")}`);
}

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
  if (
    (event.code === "KeyK" && event.metaKey && !event.altKey && !event.ctrlKey) ||
    (event.key === "/" && !event.metaKey && !event.altKey && !event.ctrlKey && event.target === document.body)
  ) {
    if (input.getBoundingClientRect().x < 0) toggle.click();
    input.focus();
    input.select();
    event.preventDefault();
  }
});
