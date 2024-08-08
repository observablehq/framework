export function plural(
  n,
  singular,
  { plural = `${singular}s`, locale = "en-US" } = {}
) {
  return `${n.toLocaleString(locale)} ${n === 1 ? singular : plural}`;
}
