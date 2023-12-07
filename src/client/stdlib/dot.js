import {instance} from "npm:@viz-js/viz";

const viz = await instance();

export default function dot(strings) {
  let string = strings[0] + "";
  let i = 0;
  let n = arguments.length;
  while (++i < n) string += arguments[i] + "" + strings[i];
  const svg = viz.renderSVGElement(string, {
    graphAttributes: {
      bgcolor: "none",
      color: "#00000101",
      fontcolor: "#00000101",
      fontname: "var(--sans-serif)",
      fontsize: "12"
    },
    nodeAttributes: {
      color: "#00000101",
      fontcolor: "#00000101",
      fontname: "var(--sans-serif)",
      fontsize: "12"
    },
    edgeAttributes: {
      color: "#00000101"
    }
  });
  for (const e of svg.querySelectorAll("[stroke='#000001'][stroke-opacity='0.003922']")) {
    e.setAttribute("stroke", "currentColor");
    e.removeAttribute("stroke-opacity");
  }
  for (const e of svg.querySelectorAll("[fill='#000001'][fill-opacity='0.003922']")) {
    e.setAttribute("fill", "currentColor");
    e.removeAttribute("fill-opacity");
  }
  svg.remove();
  svg.style = "max-width: 100%; height: auto;";
  return svg;
}
