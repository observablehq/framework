---
theme: dashboard
---

# Food imports to the United States

In 2023, the United States imported more than ${d3.format("$d")(d3.sum(sample, d => +d.FoodValue)/1000)} billion in edible products from its ${n} leading exporters. The variety is vast, with distinctive contributions arriving from each major supplier. Data: [US Department of Agriculture](https://www.ers.usda.gov/data-products/u-s-food-imports/)

```js
// components
import {Marimekko} from './components/Marimekko.js'
import {Sunburst} from './components/Sunburst.js'
```

```js
// todo:
// make sure color schemes work
// delete colors
// attend to color arg for sunburst and marimekko
// make sure marimekko rows don't change height
// flesh out read mes
// add selector to alternate btw views of stream graph
// final clean-up
```

```js
// full palette from dictionary-of-colour-combinations by Sanzo Wada,
// source: https://github.com/mattdesl/dictionary-of-colour-combinations/blob/master/colors.json
const colors = FileAttachment("./data/colors.json").json();
```

```js
const n = view(Inputs.radio([4, 8, 12, 16], {
  label: html`Top <em>n</em> importers`,
  value: 12
}));
```

```js
const tidy = await FileAttachment("./data/FoodImports.csv").csv({typed: true});

// Values from the most recent year
const recent = tidy.filter(d => d.YearNum === 2023);

// Top-n from the most recent year
const topN = d3.groupSort(recent, (v) => d3.sum(v, (k) => k.FoodValue), (d) => d.Country).slice(-n).reverse();

// Sample from the most recent year (for Marimekko and Sunburst)
const sample = recent.filter((d) => topN.includes(d.Country));
```

```js
// Food categories, sorted by size over first 4 countries, with "other" moved to the end
const sampleSlice = sample.filter(d => topN.slice(0,4).includes(d.Country))
const categories = d3.groupSort(recent, (v) => -d3.sum(v, (d) => d.FoodValue), (d) => d.Category)
categories.push(categories.splice(categories.indexOf('Other'), 1)[0]);
const categoryColor = d3.scaleOrdinal().domain(categories).range(["#bce4e5", "#a7d4e4", "#a5c8d1", "#97acc8", "#96d1aa", "#78cdd0", "#62c6bf", "#0093a5", "#00939b", "#099197", "#5a82b3", "#006eb8", "#007190", "#005b8d"]);
```

```js
// Marimekko: by Country and Category for 2023
const byCountryAndCategory = d3.sort(
  d3.flatRollup(
    sample,
    (v) => d3.sum(v, (d) => d.FoodValue),
    (d) => d.Country,
    (d) => d.Category
  )
  .map(([Country, Category, value]) => ({Country, Category, value})),
  ({Country}) => topN.indexOf(Country), 
  ({Category}) => categories.indexOf(Category),
);

const rowOneHeight = 200
const rowOnePortion = d3.sum(byCountryAndCategory.filter(d => d.Country === topN[0]), d => d.value)
const all = d3.sum(byCountryAndCategory, d => d.value)
const mekkoHeight = rowOneHeight * all / rowOnePortion
```

```js
// Sunburst: category and subcategory totals for 2023 across all countries
const nest = {
  name: "Food imports",
  children: d3.rollups(
    sample,
    (v) => d3.sum(v, (d) => d.FoodValue),
    (d) => d.Category,
    (d) => d.Commodity
  ).map(([name, children]) => ({
    name,
    children: Array.from(children, ([name, value]) => ({name, value}))
  }))
};
// reorder nodes to match category order established above
nest.children = d3.sort(nest.children, (d) => categories.indexOf(d.name))
```

```js
// Timeline: year, country, total
// All-time values for the timeline
const timely = tidy.filter((d) => topN.includes(d.Country))
  .map(d => ({year: d.YearNum, value: d.FoodValue, country: d.Country}));

const byYearAndCountry = d3.groups(timely, d => d.year, d => d.country)
  .map(d => d[1].map(k => ({
    year: new Date(d[0], 0, 1), // UTC dates
    country: k[0],
    value: d3.sum(k[1], (j) => j.value)
    })
  ))
  .flat();

const areaColors = ["#cc1236", "#c53c69", "#b73f74", "#b71f57", "#a94151", "#a84222", "#a62c37", "#ab2439", "#a72144", "#7c4226", "#793327", "#82241f", "#7d133a", "#802626", "#642d5e", "#6d4145"];
const areaData = byYearAndCountry;
```

<div class="grid grid-cols-2" style="grid-auto-rows: auto;">
  <div class="card grid-colspan-2">
    <h2>Distribution of food imports by country and category</h2>
    <h3>from top ${n} countries, 2023</h3>
    ${resize((width) => Marimekko(byCountryAndCategory, {
      width,
      height: mekkoHeight,
      color: categoryColor
    }))}
  </div>
  <div class="card" style="min-height: 600px;">
    <h2>Food imports to the Unites States, 2023</h2>
    <h3>Share of imports by category and subcategory</h3>
    ${resize((width) => Sunburst(nest, {
      width,
      value: (d) => d.value,
      label: (d) => d.name,
      color: categoryColor,
      sort: null, // to avoid default sorting and instead inherit order in the data
      title: (d, n) => `${n.ancestors().reverse().map(d => d.data.name).join(".")}\n${n.value.toLocaleString("en")}`
    }))}
  </div>
  <div class="card">
    <h2>Relative share of food imports to the US</h2>
    <h3>Across top ${n} countries, 1999–2023</h3>
    ${resize((width) => Plot.plot({
      width,
      height: 600,
      marginLeft: 50,
      marginRight: 120,
      color: {
        domain: topN,
        range: areaColors
      },
      y: {
        grid: true,
        label: "↑ Food Import $",
        tickFormat: "%"
      },
      marks: [
        Plot.areaY(
          areaData,
          {
            x: "year",
            y: "value",
            z: "country",
            offset: "normalize",
            fill: "country",
            sort: d => -topN.indexOf(d.country), 
            curve: "monotone-x"
          }
        ),
        Plot.textY(
          areaData,
          Plot.selectMaxX(
            Plot.stackY({
              x: "year",
              y: "value",
              z: "country",
              offset: "normalize",
              sort: d => -topN.indexOf(d.country), 
              text: "country",
              dx: "8",
              textAnchor: "start",
            })
          )
        ),
        Plot.ruleY([0, 1])
      ]}))}
  </div>
</div>