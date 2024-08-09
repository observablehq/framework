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
```

<div>${nInput}</div>

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
// helper functions
const yearParse = d3.utcParse('%Y')
```

<div class="grid grid-cols-2" style="grid-auto-rows: 520px;">
  <div class="card grid-colspan-1">
    <h2>Relative share of food imports to the US</h2>
    <h3>across top ${n} countries, 1999–2023</h3>
    ${resize((width, height) => Plot.plot({
      marginLeft: 50,
      marginRight: 50,
      width,
      height: height - 40,
      color: {
        type: "ordinal",
        domain: tops, 
        scheme: "Set3"
      },
      y: {
        grid: true,
        label: "↑ Percent of food imports"
      },
      marks: [
        Plot.areaY(
          byYearAndCountry.filter(d => tops.includes(d.country)),
          {
            x: "year", 
            y: "value", 
            fill: "country", 
            offset: 'normalize', 
            order: "group", 
            reverse: true
          }
        ),
        Plot.ruleY([0]),
        Plot.textY(byYearAndCountry.filter(d => tops.includes(d.country)),
          Plot.selectLast(
            Plot.stackY({
              x: "year",
              y: "value",
              fill: "country",
              stroke: "country",
              strokeWidth: 1,
              order: "group",
              text: "country",
              interval: "year",
              textAnchor: 'start',
              offset: 'normalize',
              reverse: true
            })
          )
        )
      ]
    }))}
  </div>
  <div class="card grid-colspan-1">
  <h2>Food imports to the Unites States, 2023</h2>
  <h3>Global share by category and subcategory</h3>
  ${resize((width, height) => Sunburst(nest, {
    value: d => d.value,
    label: d => d.name,
    title: (d, n) => `${n.ancestors().reverse().map(d => d.data.name).join(".")}\n${n.value.toLocaleString("en")}`, // hover text
    width,
    height,
  }))}
  </div>
</div>

<div class=" card" >
  <h2 >Distribution of food imports by country and category</h2>
   <h3 >from top ${n} countries, 2023</h3>
   ${Marimekko(byCountryAndCategory, {
    width
    })} 
</div>

