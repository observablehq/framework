import mer from "npm:mermaid";

let nextId = 0;
const theme = getComputedStyle(document.body).getPropertyValue("color-scheme") === "dark" ? "dark" : "neutral";
mer.initialize({startOnLoad: false, securityLevel: "loose", theme});

export default async function mermaid() {
  const root = document.createElement("div");
  root.innerHTML = (await mer.render(`mermaid-${++nextId}`, String.raw.apply(String, arguments))).svg;
  return root.removeChild(root.firstChild);
}
