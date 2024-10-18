import {observe} from "./observe.js";

// Watches dark mode based on theme and user preference.
export function dark(target: HTMLElement = document.body) {
  return observe((notify: (dark: boolean) => void) => {
    let dark: boolean | undefined;
    target.style.setProperty("transition-property", "color");
    target.style.setProperty("transition-duration", "0.001s");
    const changed = () => {
      const d = getComputedStyle(target).getPropertyValue("color-scheme") === "dark";
      if (dark === d) return; // only notify if changed
      notify((dark = d));
    };
    changed();
    target.addEventListener("transitionstart", changed);
    return () => target.removeEventListener("transitionstart", changed);
  });
}
