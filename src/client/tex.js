export async function tex() {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://cdn.jsdelivr.net/npm/katex/dist/katex.min.css";
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);

  const {default: katex} = await import("npm:katex");
  const tex = renderer();

  function renderer(options) {
    return function () {
      const root = document.createElement("div");
      katex.render(String.raw.apply(String, arguments), root, {...options, output: "html"});
      return root.removeChild(root.firstChild);
    };
  }

  tex.options = renderer;
  tex.block = renderer({displayMode: true});
  return tex;
}
