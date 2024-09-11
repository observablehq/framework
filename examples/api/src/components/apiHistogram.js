import * as Plot from "npm:@observablehq/plot";
import * as d3 from "npm:d3";
import {dy} from "./apiHeatmap.js";

const marginTop = 0;
const marginRight = 20;
const marginBottom = 30;
const marginLeft = 20;

const canvasCache = new WeakSet();

export function ApiHistogram(
  value,
  count,
  category,
  {canvas = document.createElement("canvas"), color, width, height = 360, label, y1, y2}
) {
  const ky = 165; // number of requests per pixel

  const plot = Plot.plot({
    figure: true,
    width,
    height,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    style: "overflow: visible;",
    x: {type: "log", domain: [y1, y2 - 1], label},
    y: {axis: null, domain: [0, (height - marginTop - marginBottom) * ky], label: "requests"},
    color: {label: color.label},
    marks: [
      Plot.ruleY([0]),
      Plot.tip({length: 1}, {fill: [""], x: [y1], y: [0], format: {x: null, y: null}, render: renderTip})
    ]
  });

  const svg = plot.querySelector("svg");
  const div = document.createElement("div");
  div.style = "position: relative;";

  if (!canvasCache.has(canvas)) {
    canvasCache.add(canvas);
    canvas.width = dy;
    canvas.height = height - marginTop - marginBottom;
    canvas.style = `
      image-rendering: pixelated;
      position: absolute;
      left: ${marginLeft}px;
      top: ${marginTop}px;
      width: calc(100% - ${marginLeft + marginRight}px);
      height: calc(100% - ${marginTop + marginBottom}px);
    `;

    const tick = (i, j1, j2) => {
      for (let j = j1; j < j2; ++j) {
        let sum = 0;
        for (; i < value.length; ++i) {
          const currentValue = value.get(i);
          if (currentValue < j) continue;
          if (currentValue > j) break;
          const currentCount = count.get(i);
          const currentCategory = category.get(i);
          const y0 = plot.scale("y").apply(sum);
          const y1 = plot.scale("y").apply((sum += currentCount));
          context.fillStyle = color.apply(currentCategory);
          context.fillRect(j, y1, 1, y0 - y1);
        }
      }
      if (j2 < dy) requestAnimationFrame(() => tick(i, j2, j2 + (j2 - j1)));
    };

    const context = canvas.getContext("2d");
    requestAnimationFrame(() => tick(0, 0, 20));
  }

  svg.style.position = "relative";
  svg.replaceWith(div);
  div.appendChild(canvas);
  div.appendChild(svg);

  function renderTip(index, scales, values, dimensions, context, next) {
    let g = next([], scales, values, dimensions, context);
    const svg = context.ownerSVGElement;
    svg.addEventListener("pointerenter", pointermove);
    svg.addEventListener("pointermove", pointermove);
    svg.addEventListener("pointerleave", pointerleave);
    function pointermove(event) {
      const [px, py] = d3.pointer(event);
      const found = find(scales.x.invert(px), scales.y.invert(py));
      if (found == null) return pointerleave();
      const [k, y] = found;
      values.x[0] = px;
      values.y[0] = scales.y(y);
      values.fill[0] = color.apply(category.get(k));
      values.channels.fill.value[0] = category.get(k);
      const r = next([0], scales, values, dimensions, context);
      g.replaceWith(r);
      g = r;
    }
    function pointerleave() {
      const r = next([], scales, values, dimensions, context);
      g.replaceWith(r);
      g = r;
    }
    return g;
  }

  function find(y, currentCount) {
    if (!(y1 <= y && y <= y2)) return;
    const currentValue = Math.floor(((Math.log(y) - Math.log(y1)) / (Math.log(y2) - Math.log(y1))) * dy);
    let i = 0, j, sum = 0;
    for (; i < value.length; ++i) {
      if (value.get(i) < currentValue) continue;
      if (value.get(i) > currentValue) break;
      if ((sum += count.get((j = i))) >= currentCount) break;
    }
    if (sum) return [j, sum - count.get(j) / 2];
  }

  return plot;
}
