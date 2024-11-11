export function revive(object) {
  if (Array.isArray(object)) {
    for (const key in object) {
      const value = object[key];
      if (isIsoString(value)) object[key] = new Date(value);
      else revive(value);
    }
  } else if (object && typeof object === "object") {
    for (const key in object) {
      const value = object[key];
      if (isIsoString(value)) object[key] = new Date(value);
      else revive(value);
    }
  }
  return object;
}

function isIsoString(value) {
  return typeof value === "string" && /^\d{4,}-\d{2}-\d{2}T/.test(value);
}
