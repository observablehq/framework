export function capitalizeFirstLetter(string) {
  if (string.length < 1) return string;
  return string[0].toUpperCase() + string.substring(1);
}

export function formatCount(n) {
  if (n < 1e3) return `${n}`;
  if (n < 1e6) return `${+(n / 1e3).toFixed(1)}k`;
  return `${+(n / 1e6).toFixed(1)}m`;
}
