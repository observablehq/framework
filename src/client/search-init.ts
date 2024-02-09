const container = document.querySelector("#observablehq-search")!;

const input = container.querySelector("input")! as HTMLInputElement;
input.setAttribute("placeholder", `Search pages… ${/Mac|iPhone/.test(navigator.platform) ? "⌘" : "Alt-"}K`);

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

// focus on meta-K and /
const toggle = document.querySelector("#observablehq-sidebar-toggle")! as HTMLInputElement;
addEventListener("keydown", (event) => {
  if (
    (event.code === "KeyK" && event.metaKey && !event.altKey && !event.ctrlKey) ||
    (event.key === "/" && !event.metaKey && !event.altKey && !event.ctrlKey && event.target === document.body)
  ) {
    toggle.classList.add("observablehq-sidebar-on");
    input.onblur = () => toggle.classList.remove("observablehq-sidebar-on");
    input.focus();
    input.select();
    event.preventDefault();
  }
});
