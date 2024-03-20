import mer from "npm:mermaid";
import {Generators} from "observablehq:stdlib";

let nextId = 0;

(async () => {
  for await (const dark of Generators.dark())
    mer.initialize({startOnLoad: false, securityLevel: "loose", theme: dark ? "dark" : "neutral"});
})();

export default async function mermaid() {
  const root = document.createElement("div");
  root.innerHTML = (await mer.render(`mermaid-${++nextId}`, String.raw.apply(String, arguments))).svg;
  return root.removeChild(root.firstChild);
}
