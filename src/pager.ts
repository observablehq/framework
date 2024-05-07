import type {Config, Page} from "./config.js";

export type PageLink =
  | {prev: undefined; next: Page} // first page
  | {prev: Page; next: Page} // middle page
  | {prev: Page; next: undefined}; // last page

// Pager links in the footer are computed once for a given navigation.
const linkCache = new WeakMap<Config["pages"], Map<string, PageLink>>();

export function normalizePath(path: string): string {
  return path.replace(/[?#].*$/, "");
}

export function findLink(path: string, options: Pick<Config, "pages" | "title"> = {pages: []}): PageLink | undefined {
  const {pages, title} = options;
  let links = linkCache.get(pages);
  if (!links) {
    links = new Map<string, PageLink>();
    for (const pageGroup of walk(pages, title)) {
      let prev: Page | undefined;
      for (const page of pageGroup) {
        const path = normalizePath(page.path);
        if (links.has(path)) {
          console.warn(`ignoring duplicate page: ${page.path}`);
        } else {
          if (prev) {
            links.set(path, {prev, next: undefined});
            links.get(normalizePath(prev.path))!.next = page;
          } else {
            links.set(path, {prev: undefined, next: undefined as unknown as Page}); // next set lazily
          }
          prev = page;
        }
      }
    }
    if (links.size === 1) links.clear(); // no links if only one page
    linkCache.set(pages, links);
  }
  return links.get(path);
}

// Walks the unique pages in the site so as to avoid creating cycles. Implicitly
// adds a link at the beginning to the home page (/index).
function walk(pages: Config["pages"], title = "Home"): Iterable<Iterable<Page>> {
  const pageQueue = [...pages];
  const pageGroups = new Map<string, Page[]>();
  const visited = new Set<string>();

  function visit(page: Page) {
    if (visited.has(page.path) || !page.pager) return;
    visited.add(page.path);
    let pageGroup = pageGroups.get(page.pager);
    if (!pageGroup) pageGroups.set(page.pager, (pageGroup = []));
    pageGroup.push(page);
  }

  visit({name: title, path: "/index", pager: "main"});

  for (const page of pageQueue) {
    if ("pages" in page) for (const p of page.pages) pageQueue.push(p);
    else visit(page);
  }

  return pageGroups.values();
}
