// TODO Automatically disconnect the observer when the returned DIV is detached.
export function resize(run: (width: number, height: number) => Node, invalidation?: Promise<void>): Node {
  const div = document.createElement("div");
  div.style.position = "relative";
  if (run.length !== 1) div.style.height = "100%";
  const observer = new ResizeObserver(([entry]) => {
    const {width, height} = entry.contentRect;
    while (div.lastChild) div.lastChild.remove();
    if (width > 0) {
      const child = run(width, height);
      // prevent feedback loop if height is used
      if (run.length !== 1 && isElement(child)) child.style.position = "absolute";
      div.append(child);
    }
  });
  observer.observe(div);
  invalidation?.then(() => observer.disconnect());
  return div;
}

function isElement(node: Node): node is HTMLElement {
  return node.nodeType === 1;
}
