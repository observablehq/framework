import {observe} from "./generators/observe.js";

// Override the width definition to use main instead of body (and also use a
// ResizeObserver instead of listening for window resize events).
export function width(target = document.querySelector<HTMLElement>("main")!) {
  return observe((notify: (width: number) => void) => {
    let width: number;
    const observer = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      if (w !== width) notify((width = w));
    });
    observer.observe(target);
    return () => observer.disconnect();
  });
}
