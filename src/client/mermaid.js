export async function mermaid() {
  let nextId = 0;
  const {default: mer} = await import("https://cdn.jsdelivr.net/npm/mermaid/+esm");
  const theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "neutral";
  mer.initialize({startOnLoad: false, securityLevel: "loose", theme});
  return async function mermaid() {
    const root = document.createElement("div");
    root.innerHTML = (await mer.render(`mermaid-${++nextId}`, String.raw.apply(String, arguments))).svg;
    return root.removeChild(root.firstChild);
  };
}
