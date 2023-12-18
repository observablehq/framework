const sidebar = document.querySelector<HTMLElement>("#observablehq-sidebar")!;
const toggle = document.querySelector<HTMLInputElement>("#observablehq-sidebar-toggle")!;

// Restore the sidebar state from sessionStorage, or set it to indeterminate.
const initialState = sessionStorage.getItem("observablehq-sidebar");
if (initialState) toggle.checked = initialState === "true";
else toggle.indeterminate = true;

// Restore the sidebar section state from sessionStorage, but don’t close any
// section that contains the active page.
for (const summary of document.querySelectorAll("#observablehq-sidebar summary")) {
  const details = summary.parentElement as HTMLDetailsElement;
  switch (sessionStorage.getItem(`observablehq-sidebar:${summary.textContent}`)) {
    case "true":
      details.open = true;
      break;
    case "false":
      if (!details.classList.contains("observablehq-section-active")) details.open = false;
      break;
  }
}

// Persist the sidebar scroll offset when navigating to another page.
addEventListener("beforeunload", () => sessionStorage.setItem("observablehq-sidebar-scrolly", `${sidebar.scrollTop}`));
const scrolly = sessionStorage.getItem("observablehq-sidebar-scrolly");
if (scrolly != null) {
  sidebar.style.cssText = "overflow: hidden;"; // prevent scrollbar flash
  sidebar.scrollTop = +scrolly;
  sidebar.style.cssText = "";
}
