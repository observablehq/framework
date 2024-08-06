---
theme: dashboard
---

# Food imports to the United States
## By category, subcategory, and country of origin

```js
import {Marimekko} from './components/Marimekko.js'
```

```js
const imports = FileAttachment("./data/FoodImports.csv").csv();
```

```js
const yearParse = d3.utcParse('%Y')
 // totals for each country/year/commodity combo
const timely = imports
  .filter(d => d.SubCategory === 'Foods')
  .filter(d => d.Category !== 'Food Dollars' && d.Category !== 'Food volume')
  .filter(d => !d.Commodity.includes('Total'))
  .filter(d => d.Country !== "WORLD" && d.Country !== "WORLD (Quantity)" && d.Country !== "REST OF WORLD")
  .map(d => ({year: d.YearNum, value: +d.FoodValue, country: d.Country}))


// grouping categories
const reduced = d3.groups(timely, d => d.year, d => d.country)
  .map(d => d[1].map(k => ({
    year: yearParse(d[0]),
    country: k[0],
    value: d3.sum(k[1], j => j.value)
    })
  ))
  .flat()

const tops = d3.groups(reduced, d => d.country)
  .map(d => [d[0], d3.sum(d[1], k => k.value)])
  .sort((a,b) => b[1] - a[1])
  .map(d => d[0])
  .filter((_,i) => i < 12)

const sample = imports
  //.filter(d => d.YearNum === "2023") // do this later!
  .filter(d => d.SubCategory === 'Foods')
  .filter(d => d.Category !== 'Food Dollars' && d.Category !== 'Food volume')
  .filter(d => !d.Commodity.includes('Total'))
  .filter(d => d.Country !== "WORLD" && d.Country !== "WORLD (Quantity)")
  //.filter(d => d.Country === country)

const nested = d3.groups(sample, d => d.Category, d => d.Commodity)
    .map(d => ({
        name: d[0],
        children: d[1].map(j => ({
            name: j[0],
            value: +j[1][0]['FoodValue']
        }))
    }))
  const nest = { name: 'food imports', children: nested}

const sallies = d3.groups(sample, d => d.Country, d => d.Category)
  .map(d => d[1].map(k => ({
    market: d[0],
    segment: k[0],
    value: d3.sum(k[1], j => +j['FoodValue'])
    })
  )).flat()
  .filter(d => tops.includes(d.market))
```

```js
```



```js
//   // based on @d3/marimekko-chart
//   //const width = 600;
//   const height = 300;
//   const marginTop = 30;
//   const marginRight = -1;
//   const marginBottom = -1;
//   const marginLeft = 1;

//   // Create the color scale.
//   const color = d3.scaleOrdinal(d3.schemeSet1.concat(d3.schemeSet2).slice(0,14))
//     .domain(Array.from(new Set(sallies.map(d => d.segment))));

//   // Compute the layout.
//   const treemap = data => d3.treemap()
//       .round(true)
//       .tile(d3.treemapSliceDice)
//       .size([
//         width - marginLeft - marginRight,
//         height - marginTop - marginBottom
//       ])
//     (d3.hierarchy(d3.group(data, d => d.market, d => d.segment)).sum(d => d.value))
//     .each(d => {
//       d.x0 += marginLeft;
//       d.x1 += marginLeft;
//       d.y0 += marginTop;
//       d.y1 += marginTop;
//     });
//   const root = treemap(sallies);

//   // Create the SVG container.
//   const svg = d3.create("svg")
//       .attr("viewBox", [0, 0, width, height])
//       .attr("width", width)
//       .attr("height", height)
//       .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");

//   // Position the nodes.
//   const node = svg.selectAll("g")
//     .data(root.descendants())
//     .join("g")
//       .attr("transform", d => `translate(${d.x0},${d.y0})`);

//   const format = d => d.toLocaleString();

//   // Draw column labels.
//   const column = node.filter(d => d.depth === 1);

//   column.append("text")
//       .attr("x", 3)
//       .attr("y", "-1.7em")
//       .style("font-weight", "bold")
//       .text(d => d.data[0]);

//   column.append("text")
//       .attr("x", 3)
//       .attr("y", "-0.5em")
//       .attr("fill-opacity", 0.7)
//       .text(d => format(d.value));

//   column.append("line")
//       .attr("x1", -0.5)
//       .attr("x2", -0.5)
//       .attr("y1", -30)
//       .attr("y2", d => d.y1 - d.y0)
//       .attr("stroke", "#000")

//   // Draw leaves.
//   const cell = node.filter(d => d.depth === 2);

//   cell.append("rect")
//       .attr("fill", d => color(d.data[0]))
//       .attr("fill-opacity", (d, i) => d.value / d.parent.value)
//       .attr("width", d => d.x1 - d.x0 - 1)
//       .attr("height", d => d.y1 - d.y0 - 1);

//   // cell.append("text")
//   //     .attr("x", 3)
//   //     .attr("y", "1.1em")
//   //     .text(d => d.data[0]);

//   // cell.append("text")
//   //     .attr("x", 3)
//   //     .attr("y", "2.3em")
//   //     .attr("fill-opacity", 0.7)
//   //     .text(d => format(d.value));

// //   return svg.node();
//display(Marimekko(sallies));
```

```js
import {Sunburst} from './components/Sunburst.js'
```

```js

```

<div class="grid grid-cols-2" style="grid-auto-rows: 520px;">
  <div class="card grid-colspan-1">
    <h2>Area chart title</h2>
    <h3>Some description</h3>
    ${resize((width, height) => Plot.plot({
      marginLeft: 50,
      width,
      height: height - 40,
      y: {
        grid: true,
        label: "↑ Food Import $"
      },
      marks: [
        Plot.areaY(
          reduced.filter(d => tops.includes(d.country)),
          {x: "year", y: "value", fill: "country",offset: 'normalize' , order: "group", reverse: true}
        ),
        Plot.ruleY([0])
      ]
    }))}
  </div>
  <div class="card grid-colspan-1">
  <h2>Sunburst</h2>
  <h3>Some description of what this is</h3>
  ${resize((width, height) => Sunburst(nest, {
    value: d => d.value,
    label: d => d.name,
    title: (d, n) => `${n.ancestors().reverse().map(d => d.data.name).join(".")}\n${n.value.toLocaleString("en")}`, // hover text
    width,
    height,
  }))}
  </div>
</div>

<div class="grid card">
  <h2>Marimekko</h2>
   <h3>Some description of what this is</h3>
  ${resize((width, height) => Marimekko(sallies))}
</div>
