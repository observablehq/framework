import * as d3 from "npm:d3";
 
// adapted from @d3/marimekko-chart
// i.e. turned vertical, changed color scheme

// todo: genericize into a true component
// same order as stream graph

 export function Marimekko(data, {
  width = 800, 
  height = 600,
  color = d3.interpolateBlues,
  opacity = .99
 } = {}) {
  const marginTop = 10;
  const marginRight = 100;
  const marginBottom = 20;
  const marginLeft = 10;

  const treemap = data => d3.treemap()
  .round(true)
  .tile(d3.treemapSliceDice)
  .size([ 
    height - marginTop - marginBottom,
    width - marginLeft - marginRight,
  ])
(d3.hierarchy(d3.group(data, d => d.Country, d => d.Category)).sum(d => d.value))
.each(d => { // x0 etc just placeholders that don't necessarily denote x and y axes
  d.x0 += marginTop;
  d.x1 += marginTop;
  d.y0 += marginLeft;
  d.y1 += marginLeft;
});
const root = treemap(data);

  // Create the SVG container.
  const svg = d3.create("svg")
      .attr("viewBox", [0, 0, width, height])
      .attr("width", width)
      .attr("height", height)
      //.attr('transform', 'rotate(90)')
      //.attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;")
      //test these
      .attr("style", "max-width: 100%; min-height: 100%; font: 10px sans-serif;");

  // Position the nodes.
  const node = svg.selectAll("g")
    .data(root.descendants())
    .join("g")
    .attr("transform", d => `translate(${d.y0},${d.x0})`);

  const format = d => d.toLocaleString();

  // Draw column labels.
  const column = node.filter(d => d.depth === 1);

  column.append("text")
      .attr("x", `${100*(width - marginLeft - marginRight)/width}%`)
      .attr("dx", 8)
      .attr("y", d => d.y0)
      .attr('fill', 'white')
      .text(d => d.data[0]);

  column.append("text")
    .attr("x", `${100*(width - marginLeft - marginRight)/width}%`)
    .attr("dx", 8)
    .attr("y", d => d.y0 + 16)
    .attr('fill', 'white')
    .attr("fill-opacity", 0.7)
    .text((d,i) => i < 2 ? format(d.value) : '');

  // column.append("line")
  //     .attr("x1", -0.5)
  //     .attr("x2", -0.5)
  //     .attr("y1", -30)
  //     .attr("y2", d => d.y1 - d.y0)
  //     .attr("stroke", "#000")

  // Draw leaves.
  const cell = node.filter(d => d.depth === 2);

  cell.append("rect")
      .attr("fill", d => color(d.data[0]))
      .attr("fill-opacity", opacity)//(d, i) => d.value / d.parent.value)
      .attr("height", d => d.x1 - d.x0 - 1 > 0 ? d.x1 - d.x0 - 1 : 0) // to prevent negative heights
      .attr("width", d => d.y1 - d.y0 - 1 > 0 ? d.y1 - d.y0 - 1 : 0)
      //.on('mouseover', (e,d) => console.log(d.data[0]))

  cell.append("text")
      .attr("x", 3)
      .attr("y", "1.1em")
      .text(function(d) {
        const thresh = d.y1 - d.y0
        return d.y1 - d.y0 > 60 ? d.data[0] : ''
      });

  // cell.append("text")
  //     .attr("x", 3)
  //     .attr("y", "2.3em")
  //     .attr("fill-opacity", 0.7)
  //     .text(function(d) {
  //       const thresh = d.y1 - d.y0
  //       return d.y1 - d.y0 > 60 ? format(d.value) : ''
  //     });

    return svg.node();
}