import {observe} from "./observe.js";

// Watches dark mode based on theme and user preference.
// TODO: in preview, also watch for changes in the theme meta.
export function dark() {
  return observe((notify: (dark: boolean) => void) => {
    let dark: boolean | undefined;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const changed = () => {
      const d = getComputedStyle(document.body).getPropertyValue("color-scheme") === "dark";
      if (dark === d) return; // only notify if changed
      notify((dark = d));
    };
    changed();
    media.addEventListener("change", changed);
    return () => media.removeEventListener("change", changed);
  });
}
