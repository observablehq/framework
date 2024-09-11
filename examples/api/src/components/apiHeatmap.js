import * as Plot from "npm:@observablehq/plot";
import * as d3 from "npm:d3";

export const dt = 1000 * 60 * 5; // 5 minute intervals
export const x2 = 1706832000000; // end date
export const x1 = 1706227200000; // start date
export const dx = Math.floor((x2 - x1) / dt); // number of columns
export const dy = 500; // number of rows

const margin = 30;
const marginTop = 20;
const marginRight = margin;
const marginBottom = margin;
const marginLeft = margin;

const canvasCache = new WeakSet();

export function ApiHeatmap(
  count,
  category,
  {
    canvas = document.createElement("canvas"),
    opacity = Plot.scale({opacity: {domain: [0, 25], clamp: true}}),
    color,
    width,
    height = 550,
    y1,
    y2,
    label,
  }
) {

  const plot = Plot.plot({
    figure: true,
    width,
    height,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    style: "overflow: visible;",
    x: {type: "utc", domain: [x1, x2]},
    y: {type: "log", domain: [y1, y2], label},
    color: {label: color.label},
    marks: [
      Plot.frame(),
      Plot.tip({length: 1}, {fill: [""], x: [x1], y: [y1], format: {x: null, y: null}, render: renderTip})
    ]
  });

  const svg = plot.querySelector("svg");
  const div = document.createElement("div");
  div.style = "position: relative;";

  if (!canvasCache.has(canvas)) {
    canvasCache.add(canvas);
    canvas.width = dx;
    canvas.height = dy;
    canvas.style = `
      image-rendering: pixelated;
      position: absolute;
      left: ${marginLeft}px;
      top: ${marginTop}px;
      width: calc(100% - ${marginLeft + marginRight}px);
      height: calc(100% - ${marginTop + marginBottom}px);
    `;

    const tick = (i1, i2) => {
      for (let i = i1; i < i2; ++i) {
        for (let j = 0; j < dy; ++j) {
          const k = j * dx + i;
          if (!count.get(k)) continue;
          if (category) {
            context.globalAlpha = opacity.apply(count.get(k));
            context.fillStyle = color.apply(category.get(k));
          } else {
            context.fillStyle = color.apply(count.get(k));
          }
          context.fillRect(i, dy - j - 1, 1, 1);
        }
      }
      if (i2 < dx) requestAnimationFrame(() => tick(i2, i2 + (i2 - i1)));
    };

    const context = canvas.getContext("2d");
    context.fillRect(0, 0, dx, dy);
    requestAnimationFrame(() => tick(0, 80));
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
      const k = find(scales.x.invert(px), scales.y.invert(py));
      if (k == null) return pointerleave();
      const i = k % dx;
      const j = Math.floor(k / dx);
      values.x[0] = ((i + 0.5) / dx) * (width - marginLeft - marginRight) + marginLeft;
      values.y[0] = ((dy - 0.5 - j) / dy) * (height - marginTop - marginBottom) + marginTop;
      if (category) {
        values.fill[0] = color.apply(category.get(k));
        values.channels.fill.value[0] = category.get(k);
      } else {
        values.fill[0] = color.apply(count.get(k));
        values.channels.fill.value[0] = count.get(k);
      }
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

  function find(sx, sy, maxR = 3) {
    const i = Math.floor(((sx - x1) / (x2 - x1)) * dx);
    const j = Math.floor(((Math.log(sy) - Math.log(y1)) / (Math.log(y2) - Math.log(y1))) * dy);
    let f;
    let fc = 0;
    for (let r = 0; r < maxR && fc === 0; ++r) {
      const i1 = Math.max(0, i - r);
      const i2 = Math.min(dx - 1, i + r);
      const j1 = Math.max(0, j - r);
      const j2 = Math.min(dy - 1, j + r);
      for (let i = i1; i <= i2; ++i) {
        for (let j = j1; j <= j2; ++j) {
          const k = j * dx + i;
          const kc = count.get(k);
          if (kc > fc) (fc = kc), (f = k);
        }
      }
    }
    return f;
  }

  return plot;
}
