# Food Imports to the United States
 ## by category, subcategory, and country of origin
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
Plot.plot({
  marginLeft: 50,
  width: 928,
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
})
```

```js
Sunburst(nest, {
  value: d => d.value,
  label: d => d.name,
  title: (d, n) => `${n.ancestors().reverse().map(d => d.data.name).join(".")}\n${n.value.toLocaleString("en")}`, // hover text
  width: 1152,
  height: 1152,
})
```

```js
  // based on @d3/marimekko-chart
  //const width = 600;
  const height = 300;
  const marginTop = 30;
  const marginRight = -1;
  const marginBottom = -1;
  const marginLeft = 1;

  // Create the color scale.
  const color = d3.scaleOrdinal(d3.schemeSet1.concat(d3.schemeSet2).slice(0,14))
    .domain(Array.from(new Set(sallies.map(d => d.segment))));

  // Compute the layout.
  const treemap = data => d3.treemap()
      .round(true)
      .tile(d3.treemapSliceDice)
      .size([
        width - marginLeft - marginRight, 
        height - marginTop - marginBottom
      ])
    (d3.hierarchy(d3.group(data, d => d.market, d => d.segment)).sum(d => d.value))
    .each(d => {
      d.x0 += marginLeft;
      d.x1 += marginLeft;
      d.y0 += marginTop;
      d.y1 += marginTop;
    });
  const root = treemap(sallies);

  // Create the SVG container.
  const svg = d3.create("svg")
      .attr("viewBox", [0, 0, width, height])
      .attr("width", width)
      .attr("height", height)
      .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");

  // Position the nodes.
  const node = svg.selectAll("g")
    .data(root.descendants())
    .join("g")
      .attr("transform", d => `translate(${d.x0},${d.y0})`);

  const format = d => d.toLocaleString();

  // Draw column labels.
  const column = node.filter(d => d.depth === 1);

  column.append("text")
      .attr("x", 3)
      .attr("y", "-1.7em")
      .style("font-weight", "bold")
      .text(d => d.data[0]);

  column.append("text")
      .attr("x", 3)
      .attr("y", "-0.5em")
      .attr("fill-opacity", 0.7)
      .text(d => format(d.value));

  column.append("line")
      .attr("x1", -0.5)
      .attr("x2", -0.5)
      .attr("y1", -30)
      .attr("y2", d => d.y1 - d.y0)
      .attr("stroke", "#000")

  // Draw leaves.
  const cell = node.filter(d => d.depth === 2);

  cell.append("rect")
      .attr("fill", d => color(d.data[0]))
      .attr("fill-opacity", (d, i) => d.value / d.parent.value)
      .attr("width", d => d.x1 - d.x0 - 1)
      .attr("height", d => d.y1 - d.y0 - 1);

  // cell.append("text")
  //     .attr("x", 3)
  //     .attr("y", "1.1em")
  //     .text(d => d.data[0]);

  // cell.append("text")
  //     .attr("x", 3)
  //     .attr("y", "2.3em")
  //     .attr("fill-opacity", 0.7)
  //     .text(d => format(d.value));

//   return svg.node();
display(svg.node());
```

```js
// Copyright 2021-2023 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/sunburst
function Sunburst(data, { // data is either tabular (array of objects) or hierarchy (nested objects)
  path, // as an alternative to id and parentId, returns an array identifier, imputing internal nodes
  id = Array.isArray(data) ? d => d.id : null, // if tabular data, given a d in data, returns a unique identifier (string)
  parentId = Array.isArray(data) ? d => d.parentId : null, // if tabular data, given a node d, returns its parent’s identifier
  children, // if hierarchical data, given a d in data, returns its children
  value, // given a node d, returns a quantitative value (for area encoding; null for count)
  sort = (a, b) => d3.descending(a.value, b.value), // how to sort nodes prior to layout
  label, // given a node d, returns the name to display on the rectangle
  title, // given a node d, returns its hover text
  link, // given a node d, its link (if any)
  linkTarget = "_blank", // the target attribute for links (if any)
  width = 640, // outer width, in pixels
  height = 400, // outer height, in pixels
  margin = 1, // shorthand for margins
  marginTop = margin, // top margin, in pixels
  marginRight = margin, // right margin, in pixels
  marginBottom = margin, // bottom margin, in pixels
  marginLeft = margin, // left margin, in pixels
  padding = 1, // separation between arcs
  startAngle = 0, // the starting angle for the sunburst
  endAngle = 2 * Math.PI, // the ending angle for the sunburst
  radius = Math.min(width - marginLeft - marginRight, height - marginTop - marginBottom) / 2, // outer radius
  color = d3.interpolateRainbow, // color scheme, if any
  fill = "#ccc", // fill for arcs (if no color encoding)
  fillOpacity = 0.6, // fill opacity for arcs
} = {}) {

  // If id and parentId options are specified, or the path option, use d3.stratify
  // to convert tabular data to a hierarchy; otherwise we assume that the data is
  // specified as an object {children} with nested objects (a.k.a. the “flare.json”
  // format), and use d3.hierarchy.
  const root = path != null ? d3.stratify().path(path)(data)
      : id != null || parentId != null ? d3.stratify().id(id).parentId(parentId)(data)
      : d3.hierarchy(data, children);

  // Compute the values of internal nodes by aggregating from the leaves.
  value == null ? root.count() : root.sum(d => Math.max(0, value(d)));

  // Sort the leaves (typically by descending value for a pleasing layout).
  if (sort != null) root.sort(sort);

  // Compute the partition layout. Note polar coordinates: x is angle and y is radius.
  d3.partition().size([endAngle - startAngle, radius])(root);

  // Construct a color scale.
  if (color != null) {
    color = d3.scaleSequential([0, root.children.length], color).unknown(fill);
    root.children.forEach((child, i) => child.index = i);
  }

  // Construct an arc generator.
  const arc = d3.arc()
      .startAngle(d => d.x0 + startAngle)
      .endAngle(d => d.x1 + startAngle)
      .padAngle(d => Math.min((d.x1 - d.x0) / 2, 2 * padding / radius))
      .padRadius(radius / 2)
      .innerRadius(d => d.y0)
      .outerRadius(d => d.y1 - padding);

  const svg = d3.create("svg")
      .attr("viewBox", [
        marginRight - marginLeft - width / 2,
        marginBottom - marginTop - height / 2,
        width,
        height
      ])
      .attr("width", width)
      .attr("height", height)
      .attr("style", "max-width: 100%; height: auto; height: intrinsic;")
      .attr("font-family", "sans-serif")
      .attr("font-size", 10)
      .attr("text-anchor", "middle");

  const cell = svg
    .selectAll("a")
    .data(root.descendants())
    .join("a")
      .attr("xlink:href", link == null ? null : d => link(d.data, d))
      .attr("target", link == null ? null : linkTarget);

  cell.append("path")
      .attr("d", arc)
      .attr("fill", color ? d => color(d.ancestors().reverse()[1]?.index) : fill)
      .attr("fill-opacity", fillOpacity);

  if (label != null) cell
    .filter(d => (d.y0 + d.y1) / 2 * (d.x1 - d.x0) > 10)
    .append("text")
      .attr("transform", d => {
        if (!d.depth) return;
        const x = ((d.x0 + d.x1) / 2 + startAngle) * 180 / Math.PI;
        const y = (d.y0 + d.y1) / 2;
        return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
      })
      .attr("dy", "0.32em")
      .text(d => label(d.data, d));

  if (title != null) cell.append("title")
      .text(d => title(d.data, d));

  return svg.node();
}
```
<!-- <div class="grid grid-cols-2">
  <div class="card grid-colspan-2">one–two</div>
  <div class="card">three</div>
  <div class="card">four</div>
</div> -->