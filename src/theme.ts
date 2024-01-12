import {getClientPath} from "./rollup.js";

export interface Theme {
  name: string;
  path: string;
  light?: boolean;
  dark?: boolean;
}

export const THEMES: Theme[] = [
  {name: "air", path: getClientPath("./src/style/theme-air.css"), light: true},
  {name: "alt", path: getClientPath("./src/style/theme-alt.css")},
  {name: "coffee", path: getClientPath("./src/style/theme-coffee.css"), dark: true},
  {name: "cotton", path: getClientPath("./src/style/theme-cotton.css"), light: true},
  {name: "deep-space", path: getClientPath("./src/style/theme-deep-space.css"), dark: true},
  {name: "glacier", path: getClientPath("./src/style/theme-glacier.css"), light: true},
  {name: "ink", path: getClientPath("./src/style/theme-ink.css"), dark: true},
  {name: "midnight", path: getClientPath("./src/style/theme-midnight.css"), dark: true},
  {name: "near-midnight", path: getClientPath("./src/style/theme-near-midnight.css"), dark: true},
  {name: "ocean-floor", path: getClientPath("./src/style/theme-ocean-floor.css"), dark: true},
  {name: "parchment", path: getClientPath("./src/style/theme-parchment.css"), light: true},
  {name: "slate", path: getClientPath("./src/style/theme-slate.css"), dark: true},
  {name: "stark", path: getClientPath("./src/style/theme-stark.css"), dark: true},
  {name: "sun-faded", path: getClientPath("./src/style/theme-sun-faded.css"), dark: true},
  {name: "wide", path: getClientPath("./src/style/theme-wide.css")}
];

function findTheme(name: string): Theme | undefined {
  return THEMES.find((t) => t.name === name);
}

export function renderTheme(names: string[]): string {
  const lines = ['@import url("observablehq:default.css");'];
  const hasLight = names.some((name) => name === "light" || findTheme(name)?.light);
  const hasDark = names.some((name) => name === "dark" || findTheme(name)?.dark);
  const hasDefault = names.some((name) => name === "default");
  const hasAnyLight = hasLight || hasDefault || !hasDark;
  const hasAnyDark = hasDark || hasDefault || !hasLight;
  if (!hasLight && !hasDark && !hasDefault) names = [...names, "default"];
  for (let i = 0; i < names.length; ++i) {
    let name = names[i];
    switch (name) {
      case "dashboard": {
        names = ["alt", "wide", ...names.slice(i + 1)];
        i = -1;
        continue;
      }
      case "default": {
        names = [...(!hasLight ? ["light"] : []), ...(!hasDark ? ["dark"] : []), ...names.slice(i + 1)];
        i = -1;
        continue;
      }
      case "light": {
        name = "air";
        break;
      }
      case "dark": {
        name = "near-midnight";
        break;
      }
    }
    const theme = findTheme(name);
    if (!theme) throw new Error(`invalid theme: ${name}`);
    lines.push(
      `@import url(${JSON.stringify(`observablehq:theme-${theme.name}.css`)})${
        theme.dark && !theme.light && hasAnyLight // a dark-only theme paired with a light theme
          ? " (prefers-color-scheme: dark)"
          : theme.light && !theme.dark && hasAnyDark // a light-only theme paired with a dark theme
          ? " (prefers-color-scheme: light)"
          : ""
      };`
    );
  }
  return lines.join("\n");
}
