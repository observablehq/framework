---
theme: dashboard
---

# Food imports to the United States
## By category, subcategory, and country of origin

```js
// components
import {Marimekko} from './components/Marimekko.js'
import {Sunburst} from './components/Sunburst.js'
```

```js 
// raw data
const raw = FileAttachment("./data/FoodImports.csv").csv();
```

```js
// full palette from dictionary-of-colour-combinations bySanzo Wada, 
// source: https://github.com/mattdesl/dictionary-of-colour-combinations/blob/master/colors.json
const colors = FileAttachment("./data/colors.json").json();
```

```js
// Slider to 
const nInput = Inputs.range(
  [2,20],
  {
    label: "Number of importers:",
    value: 12,
    step: 1
  }
);
const n = Generators.input(nInput)

const sInput = Inputs.range(
  [0,150],
  {
    label: "Spectrum A start",
    value: 87,
    step: 1
  }
);
const s = Generators.input(sInput)

const qInput = Inputs.range(
  [0,150],
  {
    label: "Spectrum B start",
    value: 110,
    step: 1
  }
);
const q = Generators.input(qInput)

```

```js
// data wrangling – should this all be moved to a data loader..?

// tidy & filter out precomputed aggregations
const tidy = raw
  .filter(d => d.SubCategory === 'Foods') 
  .filter(d => d.Category !== 'Food Dollars' && d.Category !== 'Food volume')
  .filter(d => !d.Commodity.includes('Total'))
  .filter(d => d.Country !== "WORLD" && d.Country !== "WORLD (Quantity)")
  .filter(d => d.Country !== "REST OF WORLD") // cleaner without this, needs annotation

const timely = tidy
  .map(d => ({year: d.YearNum, value: +d.FoodValue, country: d.Country}))

// data for area chart: year, country, total
const byYearAndCountry = d3.groups(timely, d => d.year, d => d.country)
  .map(d => d[1].map(k => ({
    year: yearParse(d[0]),
    country: k[0],
    value: d3.sum(k[1], j => j.value)
    })
  ))
  .flat()

const tops = d3.groups(byYearAndCountry, d => d.country)
  .map(d => [d[0], d3.sum(d[1], k => k.value)])
  .sort((a,b) => b[1] - a[1])
  .map(d => d[0])
  .filter((_,i) => i < n)

const sample = tidy
  .filter(d => d.YearNum === "2023")
  .filter(d => tops.includes(d.Country))

const nested = d3.groups(sample, d => d.Category, d => d.Commodity)
  .map(d => ({
      name: d[0],
      children: d[1].map(j => ({
          name: j[0],
          value: +j[1][0]['FoodValue']
      }))
  }))

//  data for suburst: category and subcategory totals for 2023 across all nations
const nest = { name: 'food imports', children: nested}

//  data for Marimekko: byCountryAndCategory for 2023
const byCountryAndCategory = d3.groups(sample, d => d.Country, d => d.Category)
  .map(d => d[1].map(k => ({
    Country: d[0],
    Category: k[0],
    value: d3.sum(k[1], j => +j['FoodValue'])
    })
  )).flat()
```

```js
const colorMap = new Map(d3.rollups(byYearAndCountry, v => d3.sum(v, d => d.value), d => d.country).sort((a,b) => b[1] - a[1]).map((d,i) => ([d[0], i%n])))
```

```js
const areaData = byYearAndCountry.map(d => ({...d, colorIndex: colorMap.get(d.country)}))
```

<div>${nInput}</div>
<div>${sInput}</div>
<div>${qInput}</div>

```js
// helper functions
const yearParse = d3.utcParse('%Y')
const areaColors = colors.slice(s,s+n).map(d => d.hex)
const sunburstColors = colors.slice(q,q+14).map(d => d.hex)
```

<div class="grid grid-cols-2" style="grid-auto-rows: auto;">
  <div class="card grid-colspan-2">
    <h2 >Distribution of food imports by country and category</h2>
    <h3 >from top ${n} countries, 2023</h3>
    ${resize((width) => Marimekko(byCountryAndCategory, {
      width,
      color: d3.scaleOrdinal().range(sunburstColors)
    }))}

  </div>
  <div class="card">
    <h2>Food imports to the Unites States, 2023</h2>
      <h3>Global share by category and subcategory</h3>
      ${resize((width, height) => Sunburst(nest, {
        value: d => d.value,
        label: d => d.name,
        color: d3.scaleOrdinal().range(sunburstColors),
        title: (d, n) => `${n.ancestors().reverse().map(d => d.data.name).join(".")}\n${n.value.toLocaleString("en")}`, 
        width, 
        height
      }))}
  </div>
  <div class="card">
    <h2>Relative share of food imports to the US</h2>
      <h3>across top ${n} countries, 1999–2023</h3>
      ${resize((width) => Plot.plot({
        width,
        height: 600,
        marginLeft: 50,
        marginRight: 120,
        color: {
          type: "ordinal",
          range: areaColors
        },
        y: {
          grid: true,
          label: "↑ Food Import $"
        },
        marks: [
          Plot.areaY(
            areaData.filter(d => tops.includes(d.country)),
            {
                x: "year",
                y: "value",
                z: "country",
                order: "sum",
                fill: "colorIndex",
                interval: "year",
                textAnchor: 'start',
                reverse: true, 
                offset: 'normalize',
            }
          ),
          Plot.textY(
            areaData.filter((d) => tops.includes(d.country)),
            Plot.selectLast(
              Plot.stackY({
                x: "year",
                dx: "8",
                y: "value",
                z: "country",
                order: "sum",
                fill: "colorIndex",
                text: "country",
                interval: "year",
                textAnchor: 'start',
                offset: 'normalize',
              })
            )
          ),
          Plot.ruleY([0])
        ]}))}
  </div>
</div>