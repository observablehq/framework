const container = document.querySelector("#observablehq-search")!;

// Set the short dynamically based on the client’s platform.
container.setAttribute("data-shortcut", `${/Mac|iPhone/.test(navigator.platform) ? "⌘" : "Alt-"}K`);

// Load search.js on demand
const input = container.querySelector<HTMLInputElement>("input")!;
const load = () => import("observablehq:search");
input.addEventListener("focus", load, {once: true});
input.addEventListener("keydown", load, {once: true});

// Focus on meta-K and /
const toggle = document.querySelector("#observablehq-sidebar-toggle")!;
addEventListener("keydown", (event) => {
  if (
    (event.code === "KeyK" && event.metaKey && !event.altKey && !event.ctrlKey) ||
    (event.key === "/" && !event.metaKey && !event.altKey && !event.ctrlKey && event.target === document.body)
  ) {
    // Force the sidebar to be temporarily open while the search input is
    // focused. (We can’t use :focus-within because the sidebar isn’t focusable
    // while it is invisible, and we don’t want to keep the sidebar open
    // persistently after you blur the search input.)
    toggle.classList.add("observablehq-sidebar-open");
    input.focus();
    input.value = sessionStorage.getItem("search-query") ?? "";
    input.select();
    event.preventDefault();
  }
});

// Allow the sidebar to close when the search input is blurred.
input.addEventListener("blur", () => toggle.classList.remove("observablehq-sidebar-open"));
