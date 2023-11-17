import type {Config, Page} from "./config.js";

export type PageLink =
  | {prev: undefined; next: Page} // first page
  | {prev: Page; next: Page} // middle page
  | {prev: Page; next: undefined}; // last page

// Pager links in the footer are computed once for a given navigation.
const pagers = new WeakMap<NonNullable<Config["pages"]>, Map<string, PageLink>>();

export function pager(path: string, options: Pick<Config, "pages" | "title"> = {}): PageLink | undefined {
  const {pages, title} = options;
  if (!pages) return;
  let links = pagers.get(pages);
  if (!links) {
    links = new Map<string, PageLink>();
    let prev: Page | undefined;
    for (const page of walk(pages, title)) {
      if (prev) {
        links.set(page.path, {prev, next: undefined});
        links.get(prev.path)!.next = page;
      } else {
        links.set(page.path, {prev: undefined, next: undefined as unknown as Page}); // next set lazily
      }
      prev = page;
    }
    if (links.size === 1) links.clear(); // no links if only one page
    pagers.set(pages, links);
  }
  return links.get(path);
}

// Walks the unique pages in the site so as to avoid creating cycles. Implicitly
// adds a link at the beginning to the home page (/index).
function* walk(pages: NonNullable<Config["pages"]>, title = "Home", visited = new Set<string>()): Generator<Page> {
  if (!visited.has("/index")) yield (visited.add("/index"), {name: title, path: "/index"});
  for (const page of pages) {
    if ("pages" in page) yield* walk(page.pages, title, visited);
    else if (!visited.has(page.path)) yield (visited.add(page.path), page);
  }
}
