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

function toggleDetails(event) {
  // Prevent double-clicking the summary toggle from selecting text.
  if (event.detail > 1) {
    event.preventDefault();
  }
  localStorage.setItem(`observablehq-sidebar-${event.target.textContent}`, String(!event.target.parentElement.open));
}

for (const summary of document.querySelectorAll("#observablehq-sidebar summary")) {
  summary.onmousedown = toggleDetails;
  switch (localStorage.getItem(`observablehq-sidebar-${summary.textContent}`)) {
    case "true":
      summary.parentElement.setAttribute("open", "open");
      break;
    case "false":
      summary.parentElement.removeAttribute("open");
      break;
  }
}
