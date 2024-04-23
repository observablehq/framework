export function revive(object) {
  if (object && typeof object === "object") {
    for (const key in object) {
      const value = object[key];
      if (value && typeof value === "object") {
        revive(value);
      } else if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
        object[key] = new Date(value);
      }
    }
  }
  return object;
}
