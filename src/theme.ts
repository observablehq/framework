import {getClientPath} from "./files.js";

export interface Theme {
  name: string;
  path: string;
  light?: boolean;
  dark?: boolean;
  index: number;
}

const LIGHT_THEMES: Omit<Theme, "index">[] = [
  {name: "air", path: getClientPath("./src/style/theme-air.css"), light: true},
  {name: "cotton", path: getClientPath("./src/style/theme-cotton.css"), light: true},
  {name: "glacier", path: getClientPath("./src/style/theme-glacier.css"), light: true},
  {name: "parchment", path: getClientPath("./src/style/theme-parchment.css"), light: true}
];

const DARK_THEMES: Omit<Theme, "index">[] = [
  {name: "coffee", path: getClientPath("./src/style/theme-coffee.css"), dark: true},
  {name: "deep-space", path: getClientPath("./src/style/theme-deep-space.css"), dark: true},
  {name: "ink", path: getClientPath("./src/style/theme-ink.css"), dark: true},
  {name: "midnight", path: getClientPath("./src/style/theme-midnight.css"), dark: true},
  {name: "near-midnight", path: getClientPath("./src/style/theme-near-midnight.css"), dark: true},
  {name: "ocean-floor", path: getClientPath("./src/style/theme-ocean-floor.css"), dark: true},
  {name: "slate", path: getClientPath("./src/style/theme-slate.css"), dark: true},
  {name: "stark", path: getClientPath("./src/style/theme-stark.css"), dark: true},
  {name: "sun-faded", path: getClientPath("./src/style/theme-sun-faded.css"), dark: true}
];

export const THEMES: Theme[] = [
  ...LIGHT_THEMES,
  ...DARK_THEMES,
  {name: "alt", path: getClientPath("./src/style/theme-alt.css")},
  {name: "wide", path: getClientPath("./src/style/theme-wide.css")}
].map((theme, i) => ({
  ...theme,
  index: i
}));

const light = findTheme("air")!;
const dark = findTheme("near-midnight")!;
const alt = findTheme("alt")!;
const wide = findTheme("wide")!;

export function findTheme(name: string): Theme | undefined {
  return THEMES.find((t) => t.name === name);
}

export function resolveTheme(names: string[]): string[] {
  if (!names.length) return []; // preserve explicitly empty theme
  const themes: Theme[] = [];
  const hasLight = names.some((name) => name === "light" || findTheme(name)?.light);
  const hasDark = names.some((name) => name === "dark" || findTheme(name)?.dark);
  const hasDefault = names.some((name) => name === "default");
  if (!hasLight && !hasDark && !hasDefault) names.unshift("default");
  for (let i = 0; i < names.length; ++i) {
    const name = names[i];
    switch (name) {
      case "dashboard": {
        themes.push(alt, wide);
        break;
      }
      case "default": {
        if (!hasLight) themes.push(light);
        if (!hasDark) themes.push(dark);
        break;
      }
      case "light": {
        themes.push(light);
        break;
      }
      case "dark": {
        themes.push(dark);
        break;
      }
      default: {
        const theme = findTheme(name);
        if (!theme) throw new Error(`unknown theme: ${name}`);
        themes.push(theme);
        break;
      }
    }
  }
  return themes.sort(({index: i}, {index: j}) => i - j).map((theme) => theme.name);
}

export function renderTheme(names: string[]): string {
  const lines = ['@import url("observablehq:default.css");'];
  const themes = names.map((name) => findTheme(name)!);
  const hasLight = themes.some((theme) => theme.light);
  const hasDark = themes.some((theme) => theme.dark);
  for (const theme of themes) {
    lines.push(
      `@import url(${JSON.stringify(`observablehq:theme-${theme.name}.css`)})${
        theme.dark && !theme.light && hasLight // a dark-only theme paired with a light theme
          ? " (prefers-color-scheme: dark)"
          : theme.light && !theme.dark && hasDark // a light-only theme paired with a dark theme
          ? " (prefers-color-scheme: light)"
          : ""
      };`
    );
  }
  return lines.join("\n");
}
