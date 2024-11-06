import {observe} from "./observe.js";

// Watches dark mode based on the color-scheme set by the current theme.
export function dark() {
  return observe((notify: (dark: boolean) => void) => {
    let dark: boolean | undefined;
    const probe = document.createElement("div");
    probe.style.setProperty("transition-property", "color");
    probe.style.setProperty("transition-duration", "0.001s");
    const changed = () => {
      const d = getComputedStyle(probe).getPropertyValue("color-scheme") === "dark";
      if (dark === d) return; // only notify if changed
      notify((dark = d));
    };
    document.body.append(probe);
    probe.addEventListener("transitionstart", changed);
    changed();
    return () => probe.remove();
  });
}
