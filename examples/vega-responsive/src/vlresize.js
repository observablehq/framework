import {resize} from "npm:@observablehq/stdlib";
import vl from "observablehq:stdlib/vega-lite";

export async function vlresize(
  {autosize = {type: "fit", contains: "padding"}, ...spec},
  {minWidth = 0, maxWidth = Infinity} = {}
) {
  const chart = await vl.render({spec: {...spec, width: -1, autosize}});
  return resize((width) => {
    chart.value.width(Math.max(minWidth, Math.min(maxWidth, width)));
    chart.value.run();
    return chart;
  });
}
