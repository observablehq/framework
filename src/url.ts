/*
 * Returns the relative path from "/file/path/to/a" to "/file/path/of/b"; To
 * make relative imports work, paths to the same directory are prefixed with ./
 */
export function relativeUrl(source, target) {
  if (target.startsWith("https:")) return target;
  const from = `/${source}`.split(/[/]+/g).slice(0, -1);
  const to = `/${target}`.split(/[/]+/g);
  const f = to.pop()!;
  const m = from.length;
  const n = Math.min(m, to.length);
  let i = 0;
  while (i < n && from[i] === to[i]) ++i;
  const k = m - i;
  return (k ? "../".repeat(k) : "./") + to.slice(i).concat(f).join("/");
}
