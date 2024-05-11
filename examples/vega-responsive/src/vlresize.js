import {resize} from "npm:@observablehq/stdlib";
import vl from "observablehq:stdlib/vega-lite";

export async function vlresize(spec, {minWidth = 0, maxWidth = Infinity} = {}) {
  const chart = await vl.render({spec});
  return resize((width) => {
    chart.value.width(Math.max(minWidth, Math.min(maxWidth, width)));
    chart.value.run();
    return chart;
  });
}
