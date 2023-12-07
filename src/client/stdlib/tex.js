import katex from "npm:katex";

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

export default tex;
