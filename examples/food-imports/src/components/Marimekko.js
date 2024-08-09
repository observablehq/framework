import * as d3 from "npm:d3";
 
// based on @d3/marimekko-chart

// todo: genericize into a true component
// todo: figure out how to make this vertical
// todo: make color scheme match other graphics

 export function Marimekko(data, {
  width = 800, 
  height = 800,
 } = {}) {
  const marginTop = 100;
  const marginRight = -1;
  const marginBottom = -1;
  const marginLeft = 1;

  // Create the color scale.
  const color = d3.scaleOrdinal(d3.schemeSet1.concat(d3.schemeSet2).slice(0,14))
    .domain(Array.from(new Set(data.map(d => d.Category))));

  // Compute the layout.
  const treemap = data => d3.treemap()
      .round(true)
      .tile(d3.treemapSliceDice)
      .size([
        width - marginLeft - marginRight,
        height - marginTop - marginBottom
      ])
    (d3.hierarchy(d3.group(data, d => d.Country, d => d.Category)).sum(d => d.value))
    .each(d => {
      d.x0 += marginLeft;
      d.x1 += marginLeft;
      d.y0 += marginTop;
      d.y1 += marginTop;
    });
  const root = treemap(data);

  // Create the SVG container.
  const svg = d3.create("svg")
      .attr("viewBox", [0, 0, width, height])
      .attr("width", width)
      .attr("height", height)
      //.attr('transform', 'rotate(90)')
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
    .attr('transform', 'rotate(-90) translate(0,30) ')
      .attr("x", 3)
      .attr("y", "-1.7em")
      .style("font-weight", "bold")
      .text(d => d.data[0]);

  column.append("text")
    .attr('transform', 'rotate(-90) translate(0,30) ')
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

    return svg.node();
}