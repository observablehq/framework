export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace("'", "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .replace(/-{2,}/g, "-");
}
