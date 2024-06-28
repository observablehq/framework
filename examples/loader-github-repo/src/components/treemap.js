// Copyright 2021-2024 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/treemap

import * as d3 from "npm:d3";

export function Treemap(
  data,
  {
    // data is either tabular (array of objects) or hierarchy (nested objects)
    path, // as an alternative to id and parentId, returns an array identifier, imputing internal nodes
    id = Array.isArray(data) ? (d) => d.id : null, // if tabular data, given a d in data, returns a unique identifier (string)
    parentId = Array.isArray(data) ? (d) => d.parentId : null, // if tabular data, given a node d, returns its parent’s identifier
    children, // if hierarchical data, given a d in data, returns its children
    value, // given a node d, returns a quantitative value (for area encoding; null for count)
    sort = (a, b) => d3.descending(a.value, b.value), // how to sort nodes prior to layout
    label, // given a leaf node d, returns the name to display on the rectangle
    group, // given a leaf node d, returns a categorical value (for color encoding)
    title, // given a leaf node d, returns its hover text
    link, // given a leaf node d, its link (if any)
    linkTarget = "_blank", // the target attribute for links (if any)
    tile = d3.treemapBinary, // treemap strategy
    width = 640, // outer width, in pixels
    height = 400, // outer height, in pixels
    margin = 0, // shorthand for margins
    marginTop = margin, // top margin, in pixels
    marginRight = margin, // right margin, in pixels
    marginBottom = margin, // bottom margin, in pixels
    marginLeft = margin, // left margin, in pixels
    padding = 1, // shorthand for inner and outer padding
    paddingInner = padding, // to separate a node from its adjacent siblings
    paddingOuter = padding, // shorthand for top, right, bottom, and left padding
    paddingTop = paddingOuter, // to separate a node’s top edge from its children
    paddingRight = paddingOuter, // to separate a node’s right edge from its children
    paddingBottom = paddingOuter, // to separate a node’s bottom edge from its children
    paddingLeft = paddingOuter, // to separate a node’s left edge from its children
    round = true, // whether to round to exact pixels
    colors = d3.schemeObservable10, // array of colors
    zDomain, // array of values for the color scale
    fill = "#ccc", // fill for node rects (if no group color encoding)
    fillOpacity = group == null ? null : 0.6, // fill opacity for node rects
    stroke, // stroke for node rects
    strokeWidth, // stroke width for node rects
    strokeOpacity, // stroke opacity for node rects
    strokeLinejoin, // stroke line join for node rects
  } = {}
) {
  // If id and parentId options are specified, or the path option, use d3.stratify
  // to convert tabular data to a hierarchy; otherwise we assume that the data is
  // specified as an object {children} with nested objects (a.k.a. the “flare.json”
  // format), and use d3.hierarchy.

  // We take special care of any node that has both a value and children, see
  // https://observablehq.com/@d3/treemap-parent-with-value.
  const stratify = (data) =>
    d3
      .stratify()
      .path(path)(data)
      .each((node) => {
        if (node.children?.length && node.data != null) {
          const child = new d3.Node(node.data);
          node.data = null;
          child.depth = node.depth + 1;
          child.height = 0;
          child.parent = node;
          child.id = node.id + "/";
          node.children.unshift(child);
        }
      });
  const root =
    path != null
      ? stratify(data)
      : id != null || parentId != null
      ? d3.stratify().id(id).parentId(parentId)(data)
      : d3.hierarchy(data, children);

  // Compute the values of internal nodes by aggregating from the leaves.
  value == null
    ? root.count()
    : root.sum((d) => Math.max(0, d ? value(d) : null));

  // Prior to sorting, if a group channel is specified, construct an ordinal color scale.
  let leaves = root.leaves();
  if (group != null) {
    leaves.forEach((d) => (d.group = group(d.data, d)));
    if (zDomain === undefined)
      zDomain = d3
        .groupSort(
          leaves,
          (V) => -d3.sum(V, (d) => d.value),
          (d) => d.group
        )
        .filter((d) => d !== undefined);
  }
  const color =
    group == null ? null : d3.scaleOrdinal(zDomain, colors).unknown("#333");

  // Sort the leaves (typically by descending value for a pleasing layout).
  if (sort != null) root.sort(sort);

  // Compute the treemap layout.
  d3
    .treemap()
    .tile(tile)
    .size([width - marginLeft - marginRight, height - marginTop - marginBottom])
    .paddingInner(paddingInner)
    .paddingTop(paddingTop)
    .paddingRight(paddingRight)
    .paddingBottom(paddingBottom)
    .paddingLeft(paddingLeft)
    .round(round)(root);

  // Filter out the small leaves
  leaves = leaves.filter((d) => (d.x1 - d.x0) * (d.y1 - d.y0) > 0.5);

  // Compute labels and titles.
  leaves.forEach((d) => (d.label = label(d.data, d)));
  if (title) leaves.forEach((d) => (d.title = title(d.data, d)));
  else leaves.forEach((d) => (d.title = d.label));

  const svg = d3
    .create("svg")
    .attr("viewBox", [-marginLeft, -marginTop, width, height])
    .attr("width", width)
    .attr("height", height)
    .attr("style", "max-width: 100%; height: auto; height: intrinsic;")
    .attr("font-family", "sans-serif")
    .attr("font-size", 10);

  const node = svg
    .selectAll("a")
    .data(leaves)
    .join("a")
    .attr("xlink:href", link == null ? null : (d) => link(d.data, d))
    .attr("target", link == null ? null : linkTarget)
    .attr("transform", (d) => `translate(${d.x0},${d.y0})`);

  node
    .append("rect")
    .attr("fill", color ? ({ group }) => color(group) : fill)
    .attr("fill-opacity", fillOpacity)
    .attr("stroke", stroke)
    .attr("stroke-width", strokeWidth)
    .attr("stroke-opacity", strokeOpacity)
    .attr("stroke-linejoin", strokeLinejoin)
    .attr("width", (d) => d.x1 - d.x0)
    .attr("height", (d) => d.y1 - d.y0);

  node.append("title").text((d) => d.title);

  // A unique identifier for clip paths (to avoid conflicts).
  const uid = `O-${Math.random().toString(16).slice(2)}`;

  const textnode = node.filter((d) => d.x1 - d.x0 > 7 && d.y1 - d.y0 > 4);

  textnode
    .append("clipPath")
    .attr("id", (d, i) => `${uid}-clip-${i}`)
    .append("rect")
    .attr("width", (d) => d.x1 - d.x0)
    .attr("height", (d) => d.y1 - d.y0);

  textnode
    .append("text")
    .attr("fill", "currentColor")
    .attr(
      "clip-path",
      (d, i) => `url(${new URL(`#${uid}-clip-${i}`, location)})`
    )
    .selectAll("tspan")
    .data((d) => d.label.split(/\n/g))
    .join("tspan")
    .attr("x", 3)
    .attr("y", (d, i, D) => `${(i === D.length - 1) * 0.3 + 1.1 + i * 0.9}em`)
    .attr("fill-opacity", (d, i, D) => (i === D.length - 1 ? 0.7 : null))
    .text((d) => d);

  const n = svg.node();
  if (color) Object.assign(n, { scales: { color } });

  return n;
}
