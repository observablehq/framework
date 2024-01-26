// this script generates a .md file for each theme
import {mkdirSync, writeFileSync} from "node:fs";
import {themes} from "./constants.ts";

function fileContent(themeType, theme) {
  return `---
theme: ${theme}
toc: false
---

<style>
#observablehq-sidebar-toggle {display: none;}
</style>


\`\`\`js
// stdlib dataset
const industriesSubset = industries.filter(d => ["Transportation and Utilities", "Mining and Extraction", "Finance", "Agriculture", "Information"].includes(d.industry));

const barData = [
  {"Category":"Alpha","Value":9.8},
  {"Category":"Beta","Value":7.8},
  {"Category":"Gamma","Value":6.3},
  {"Category":"Delta","Value":5},
  {"Category":"Epsilon","Value":4},
  {"Category":"Zeta","Value":3.2},
];
\`\`\`

# ${theme}
This is a preview of how this [theme](./config#theme) will look when used on a project page.

<div class="grid grid-cols-2">
  <div class="card">
    \${
      Plot.plot({
        title: 'Line graph title',
        subtitle: 'Subtitle text goes here',
        y: {grid: true, label: "Y", ticks: 4, tickFormat: "s"},
        x: {label: "X", ticks: 5},
        height: 200,
        width: 400,
        marks: [
          Plot.line(industriesSubset, {x: "date", y: "unemployed", stroke: "industry", strokeWidth: 1, tip: true})
        ]
      })
    }
  </div>
  <div class="card">
    \${
      Plot.plot({
        title: 'Bar graph title',
        subtitle: 'Subtitle text goes here',
        marginLeft: 75,
        height: 200,
        width: 400,
        x: {domain: [0, 10]},
        marks: [
          Plot.barX(barData, {x: "Value", y: "Category", fill: "Category"} )
        ]
      })
    }
  </div>
</div>`;
}

mkdirSync("./docs/layout/themes/showcase", {recursive: true});

for (const themeType of Object.keys(themes)) {
  for (const theme of themes[themeType]) {
    try {
      writeFileSync(`./docs/layout/themes/showcase/${theme}.md`, fileContent(themeType, theme));
    } catch (err) {
      console.log(err);
    }
  }
}
