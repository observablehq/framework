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
    for (const page of walk(pages)) {
      if (prev) {
        links.set(page.path, {prev, next: undefined});
        links.get(prev.path)!.next = page;
      } else if (title) {
        links.set(page.path, {prev: {name: title, path: "/index"}, next: undefined});
        links.set("/index", {prev: undefined, next: page});
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

function* walk(pages: NonNullable<Config["pages"]>): Generator<Page> {
  for (const page of pages) {
    if ("pages" in page) yield* walk(page.pages);
    else yield page;
  }
}
