// TODO Automatically disconnect the observer when the returned DIV is detached.
export function resize(
  render: (width: number, height: number) => Node | string | null | Promise<Node | string | null>,
  invalidation?: Promise<void>
): Node {
  const div = document.createElement("div");
  div.style.position = "relative";
  if (render.length !== 1) div.style.height = "100%";
  let currentRender = 0;
  let currentDisplay = 0;
  let currentWidth: number;
  const observer = new ResizeObserver(async ([entry]) => {
    const {width, height} = entry.contentRect;
    if (render.length === 1 && width === currentWidth) return; // ignore height-only change
    currentWidth = width;
    const childRender = ++currentRender;
    const child = width > 0 ? await render(width, height) : null; // don’t render if detached
    if (currentDisplay > childRender) return; // ignore stale renders
    currentDisplay = childRender;
    while (div.lastChild) div.lastChild.remove();
    if (child == null) return; // clear if nullish
    if (render.length !== 1 && isElement(child)) child.style.position = "absolute"; // prevent feedback loop if height is used
    div.append(child);
  });
  observer.observe(div);
  invalidation?.then(() => observer.disconnect());
  return div;
}

function isElement(node: Node | string): node is HTMLElement {
  return typeof node === "object" && node.nodeType === 1;
}
