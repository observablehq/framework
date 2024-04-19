export function formatIsoDate(date: Date): string {
  return `${[pad(date.getFullYear(), 4), pad(date.getMonth() + 1, 2), pad(date.getDate(), 2)].join("-")}T${[
    pad(date.getHours(), 2),
    pad(date.getMinutes(), 2),
    pad(date.getSeconds(), 2)
  ].join(":")}`;
}

export function formatLocaleDate(date: Date, locale: Intl.LocalesArgument = "en-US"): string {
  return date.toLocaleDateString(locale, {month: "short", day: "numeric", year: "numeric"});
}

function pad(number: number, length: number): string {
  return String(number).padStart(length, "0");
}

export function formatByteSize(n: number): string {
  const suffixes = ["bytes", "KB", "MB", "GB"];
  for (const suffix of suffixes) {
    if (n < 1300) {
      if (suffix === "bytes") return `${n} ${suffix}`;
      return `${n > 100 ? n.toFixed(0) : n.toFixed(1)} ${suffix}`;
    }
    n /= 1000;
  }
  return `${n.toFixed(1)} TiB`;
}
