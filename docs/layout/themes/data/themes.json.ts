import {basename, join} from "node:path";
import {themes} from "./constants.ts";

const THEME_TYPES = [...Object.keys(themes)];
const THEMES = [...Object.values(themes).flat()];

type ThemeType =  typeof THEME_TYPES[number];
type Theme = typeof THEMES[number];
type ThemeData = {path: string, type: ThemeType};

function getThemeData(type: ThemeType, theme: Theme): ThemeData {
  return ({path: join("showcase", basename(`${theme}.md`, ".md")), type});
}

function main() {
  const themesData: ThemeData[] = [];
  for (const themeType of THEME_TYPES) {
    for (const theme of themes[themeType]) {
      themesData.push(getThemeData(themeType, theme));
    }
  }
  return themesData;
}

process.stdout.write(JSON.stringify(main()));
