import P5 from "npm:p5";

export default function p5(sketch) {
  const node = document.createElement("div");
  Promise.resolve()
    .then(() => {})
    .then(() => {
      const p = new P5(sketch, node);
      const draw = p.draw;
      p.draw = () => (node.isConnected ? draw.apply(p, arguments) : p.remove());
    });
  return node;
}
