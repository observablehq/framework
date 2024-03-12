import {observe} from "./observe.js";

// Watches dark mode based on theme and user preference.
// TODO: in preview, also watch for changes in the theme meta.
export function dark() {
  return observe((notify: (dark: boolean) => void) => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const changed = () => notify(getComputedStyle(document.body).getPropertyValue("color-scheme") === "dark");
    changed();
    media.addEventListener("change", changed);
    return () => media.removeEventListener("change", changed);
  });
}
