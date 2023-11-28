// Override the width definition to use main instead of body (and also use a
// ResizeObserver instead of listening for window resize events).
export function width({Generators}) {
  return Generators.observe((notify) => {
    let width;
    const observer = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      if (w !== width) notify((width = w));
    });
    observer.observe(document.querySelector("main"));
    return () => observer.disconnect();
  });
}
