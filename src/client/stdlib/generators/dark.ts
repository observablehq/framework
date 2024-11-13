import {observe} from "./observe.js";

// Watches dark mode based on theme and user preference.
export function dark() {
  return observe((notify: (dark: boolean) => void) => {
    let dark: boolean | undefined;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const probe = document.createElement("div");
    probe.style.transitionProperty = "color, background-color";
    probe.style.transitionDuration = "1ms";
    const changed = () => {
      const s = getComputedStyle(document.body).getPropertyValue("color-scheme").split(/\s+/);
      let d: boolean;
      if (s.includes("light") && s.includes("dark")) d = media.matches;
      else d = s.includes("dark");
      if (dark === d) return; // only notify if changed
      notify((dark = d));
    };
    document.body.appendChild(probe);
    changed();
    probe.addEventListener("transitionstart", changed);
    media.addEventListener("change", changed);
    return () => {
      probe.removeEventListener("transitionstart", changed);
      media.removeEventListener("change", changed);
    };
  });
}
