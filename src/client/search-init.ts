const container = document.querySelector("#observablehq-search")!;

// Set the short dynamically based on the client’s platform.
container.setAttribute("data-shortcut", `${/Mac|iPhone/.test(navigator.platform) ? "⌘" : "Alt-"}K`);

// Load search.js on demand
const input = container.querySelector<HTMLInputElement>("input")!;
const load = () => import("observablehq:search");
input.addEventListener("focus", load, {once: true});
input.addEventListener("keydown", load, {once: true});

// Focus on meta-K and /
const sidebar = document.querySelector("#observablehq-sidebar")!;
addEventListener("keydown", (event) => {
  if (
    (event.code === "KeyK" && event.metaKey && !event.altKey && !event.ctrlKey) ||
    (event.key === "/" && !event.metaKey && !event.altKey && !event.ctrlKey && event.target === document.body)
  ) {
    // Force the sidebar to be temporarily open while the search input is
    // focused. The class makes the sidebar visible so the input can be focused,
    // then the :focus-within selector takes over and keeps it open until the
    // user blurs the input.
    sidebar.classList.add("observablehq-sidebar-open");
    input.focus();
    sidebar.classList.remove("observablehq-sidebar-open");
    input.select();
    event.preventDefault();
  }
});
