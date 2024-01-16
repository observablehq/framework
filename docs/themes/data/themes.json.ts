import {readdirSync } from "node:fs";
import {basename, join} from "node:path";

const BASE_DIR = process.cwd();
const THEME_TYPES = ["light", "dark", "layout"] as const;

type ThemeType =  typeof THEME_TYPES[number];
type Theme = {path: string, type: ThemeType};

function getThemesList(type: ThemeType): Theme[] {
  const themesDir = join(BASE_DIR, join("docs", "themes", `${type}-mode`));
  const themes = readdirSync(themesDir).map(path => ({path: join(basename(themesDir), basename(path, ".md")), type}));
  return themes;
}

function main() {
  let themes: Theme[] = [];
  for (const themeType of THEME_TYPES) {
    themes = themes.concat(getThemesList(themeType));
  }
  return themes;
}

process.stdout.write(JSON.stringify(main()));
