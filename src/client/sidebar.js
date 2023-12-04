const toggle = document.querySelector("#observablehq-sidebar-toggle");
if (toggle) {
  let indeterminate = toggle.indeterminate;
  toggle.onclick = () => {
    const matches = matchMedia("(min-width: calc(640px + 17px * 4 + 240px + 17px * 2))").matches;
    if (indeterminate) (toggle.checked = !matches), (indeterminate = false);
    else if (toggle.checked === matches) indeterminate = true;
    toggle.indeterminate = indeterminate;
    if (indeterminate) localStorage.removeItem("observablehq-sidebar");
    else localStorage.setItem("observablehq-sidebar", toggle.checked);
  };
  addEventListener("keypress", (event) => {
    if (event.key === "b" && event.metaKey && !event.ctrlKey) {
      toggle.click();
      event.preventDefault();
    }
  });
}

// Prevent double-clicking the summary toggle from selecting text.
function preventDoubleClick(event) {
  if (event.detail > 1) event.preventDefault();
}

function persistOpen() {
  sessionStorage.setItem(`observablehq-sidebar:${this.firstElementChild.textContent}`, this.open);
}

for (const summary of document.querySelectorAll("#observablehq-sidebar summary")) {
  summary.onmousedown = preventDoubleClick;
  summary.parentElement.ontoggle = persistOpen;
}
