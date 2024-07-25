const toggle = document.querySelector("#observablehq-sidebar-toggle");
if (toggle) {
  let indeterminate = toggle.indeterminate;
  const match = () => matchMedia("(min-width: calc(640px + 6rem + 272px))").matches;
  toggle.onclick = () => {
    const matches = match();
    if (indeterminate) (toggle.checked = !matches), (indeterminate = false);
    else if (toggle.checked === matches) indeterminate = true;
    toggle.indeterminate = indeterminate;
    if (indeterminate) sessionStorage.removeItem("observablehq-sidebar");
    else sessionStorage.setItem("observablehq-sidebar", toggle.checked);
  };
  addEventListener("keydown", (event) => {
    if (
      event.code === "Escape" &&
      !match() &&
      ((!toggle.indeterminate && toggle.checked && (event.target === document.body || event.target === toggle)) ||
        event.target?.closest("#observablehq-sidebar"))
    ) {
      toggle.click();
    }
  });
  addEventListener("keypress", (event) => {
    if (
      event.code === "KeyB" &&
      (event.metaKey || event.altKey) &&
      !event.ctrlKey &&
      (event.target === document.body || event.target === toggle || event.target?.closest("#observablehq-sidebar"))
    ) {
      toggle.click();
      event.preventDefault();
    }
  });
  const title = `Toggle sidebar ${
    /Mac|iPhone/.test(navigator.platform)
      ? /Firefox/.test(navigator.userAgent)
        ? "⌥" // option symbol for mac firefox
        : "⌘" // command symbol for mac other
      : "Alt-" // for other os or browser
  }B`;
  for (const label of document.querySelectorAll(
    "#observablehq-sidebar-toggle, label[for='observablehq-sidebar-toggle']"
  )) {
    label.title = title;
  }
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
