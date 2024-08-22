import {writeFile} from "node:fs/promises";
import {faint} from "../../src/tty.js";
import renderIndex, {themes} from "../themes.md.js";
import renderTheme from "./[theme].md.js";

async function generateFile(path: string, contents: string): Promise<void> {
  console.log(`${faint("generating")} ${path}`);
  await writeFile(path, contents);
}

await generateFile("./docs/themes.md", renderIndex());

for (const theme of themes.light) {
  await generateFile(`./docs/theme/${theme}.md`, renderTheme(theme));
}
for (const theme of themes.dark) {
  await generateFile(`./docs/theme/${theme}.md`, renderTheme(theme));
}

await generateFile("./docs/theme/light.md", renderTheme("light"));
await generateFile("./docs/theme/light-alt.md", renderTheme("[light, alt]"));
await generateFile("./docs/theme/dark.md", renderTheme("dark"));
await generateFile("./docs/theme/dark-alt.md", renderTheme("[dark, alt]"));
await generateFile("./docs/theme/wide.md", renderTheme("wide"));
await generateFile("./docs/theme/dashboard.md", renderTheme("dashboard"));
