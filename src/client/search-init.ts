const container = document.querySelector("#observablehq-search")!;

// Set the short dynamically based on the client’s platform.
container.setAttribute("data-shortcut", `${/Mac|iPhone/.test(navigator.platform) ? "⌘" : "Alt-"}K`);

// Load search.js on demand
const input = container.querySelector<HTMLInputElement>("input")!;
const load = () => import("observablehq:search");
input.addEventListener("focus", load, {once: true});
input.addEventListener("keydown", load, {once: true});
input.addEventListener("focus", () => {
  if (input.value) return; // only restore the query if empty
  input.value = sessionStorage.getItem("search-query") ?? "";
  input.select();
});

// Focus on meta-K and /
const toggle = document.querySelector<HTMLInputElement>("#observablehq-sidebar-toggle")!;
addEventListener("keydown", (event) => {
  if (
    (event.code === "KeyK" && event.metaKey && !event.altKey && !event.ctrlKey) ||
    (event.key === "/" && !event.metaKey && !event.altKey && !event.ctrlKey && event.target === document.body)
  ) {
    // Force the sidebar to be temporarily open while the search input is
    // focused. We click on the toggle if necessary to make the input visible so
    // it be focused. Then the :focus-within selector takes over and keeps it
    // open until the user blurs the input.
    if (toggle.checked) input.focus();
    else toggle.click(), input.focus(), toggle.click();
    input.value = sessionStorage.getItem("search-query") ?? "";
    input.select();
    event.preventDefault();
  }
});
