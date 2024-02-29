const toc = document.querySelector<HTMLElement>("#observablehq-toc");
if (toc) {
  const highlight = toc.appendChild(document.createElement("div"));
  highlight.classList.add("observablehq-secondary-link-highlight");
  const headings = Array.from(document.querySelector("#observablehq-main")!.querySelectorAll(toc.dataset.selector!))
    .filter((e) => e.querySelector("a.observablehq-header-anchor"))
    .reverse();
  const links = toc.querySelectorAll<HTMLElement>(".observablehq-secondary-link");
  const relink = (): HTMLElement | undefined => {
    for (const link of links) {
      link.classList.remove("observablehq-secondary-link-active");
    }
    // If there’s a location.hash, highlight that if it’s at the top of the viewport.
    if (location.hash) {
      for (const heading of headings) {
        const hash = heading.querySelector<HTMLAnchorElement>("a[href]")?.hash;
        if (hash === location.hash) {
          const top = heading.getBoundingClientRect().top;
          if (0 < top && top < 40) {
            for (const link of links) {
              if (link.querySelector<HTMLAnchorElement>("a[href]")?.hash === hash) {
                link.classList.add("observablehq-secondary-link-active");
                return link;
              }
            }
            return;
          }
          break;
        }
      }
    }
    // Otherwise, highlight the last one that’s above the center of the viewport.
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top >= innerHeight * 0.5) continue;
      const hash = heading.querySelector<HTMLAnchorElement>("a[href]")?.hash;
      for (const link of links) {
        if (link.querySelector<HTMLAnchorElement>("a[href]")?.hash === hash) {
          link.classList.add("observablehq-secondary-link-active");
          return link;
        }
      }
      break;
    }
  };
  const intersected = () => {
    const link = relink();
    highlight.style.cssText = link ? `top: ${link.offsetTop}px; height: ${link.offsetHeight}px;` : "";
  };
  const observer = new IntersectionObserver(intersected, {rootMargin: "0px 0px -50% 0px"});
  for (const heading of headings) observer.observe(heading);
}
