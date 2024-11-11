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

export function formatByteSize(x: number, locale: Intl.LocalesArgument = "en-US"): string {
  const formatOptions = {maximumSignificantDigits: 3, maximumFractionDigits: 2};
  for (const [k, suffix] of [
    [1e9, " GB"],
    [1e6, " MB"],
    [1e3, " kB"]
  ] as const) {
    if (Math.round((x / k) * 1e3) >= 1e3) {
      return (x / k).toLocaleString(locale, formatOptions) + suffix;
    }
  }
  return x.toLocaleString(locale, formatOptions) + " B";
}
