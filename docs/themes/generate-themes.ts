// this script generates a .md file for each theme
import {writeFileSync } from "node:fs";

const themes: Record<string, string[]> = {
  light: ["air", "cotton", "glacier", "parchment"],
  dark: ["coffee", "deep-space", "ink", "midnight", "near-midnight", "ocean-floor", "slate", "stark", "sun-faded"],
  layout: ["default", "wide"]
}

function fileContent(theme) {
  return `---
theme: [${theme}]
---

# ${theme}
This is a preview of how this [theme](./config#theme) will look when used on a project page.

<div class="grid grid-cols-2">
  <div class="card">
    <h2>This is a card</h2>
    <h3>Cards add polished formatting to page content.</h3>
    \${
      Plot.plot({
        marks: [
          Plot.cell(weather, {
            x: d => d.date.getUTCDate(),
            y: d => d.date.getUTCMonth(),
            fill: "temp_max"
          })
        ]
      })
    }
  </div>
  <div class="card">
    <h2>This is a card</h2>
    <h3>Cards add polished formatting to page content.</h3>
    \${
      Plot.plot({
        marks: [
          Plot.cell(weather, {
            x: d => d.date.getUTCDate(),
            y: d => d.date.getUTCMonth(),
            fill: "temp_max"
          })
        ]
      })
    }
  </div>
</div>`
}

for (const themeType of Object.keys(themes)) {
  for (const theme of themes[themeType]) {
    try {
      writeFileSync(`./docs/themes/${themeType}-mode/${theme}.md`, fileContent(theme));
      console.log(`created ${theme}.md`)
    } catch (err) {
      console.log(err);
    }
  }
}