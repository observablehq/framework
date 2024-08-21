export function dataWrapperEmbed(html, {dark, invalidation} = {}) {
  const div = document.createElement("DIV");
  div.innerHTML = html;
  const iframe = div.querySelector("iframe");

  if (dark !== undefined) iframe.setAttribute("src", iframe.getAttribute("src") + `?dark=${dark ? "true" : "false"}`);

  // Track the iframe size; needs the cell’s invalidation Promise if we want to monitor continuously.
  window.addEventListener("message", onMessage);
  if (invalidation) {
    invalidation.then(() => window.removeEventListener("message", onMessage));
  }

  return div;

  function onMessage({data}) {
    if (data["datawrapper-height"]) {
      for (let t in data["datawrapper-height"]) {
        if (iframe.getAttribute("id") === `datawrapper-chart-${t}`) {
          iframe.style.height = data["datawrapper-height"][t] + "px";
        }
      }
      if (!invalidation) {
        window.removeEventListener("message", onMessage);
      }
    }
  }
}
