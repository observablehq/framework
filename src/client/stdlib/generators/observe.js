export async function* observe(initialize) {
  let resolve;
  let value;
  let stale = false;

  const dispose = initialize((x) => {
    value = x;
    if (resolve) resolve(x), (resolve = null);
    else stale = true;
    return x;
  });

  if (dispose != null && typeof dispose !== "function") {
    throw new Error(
      typeof dispose.then === "function"
        ? "async initializers are not supported"
        : "initializer returned something, but not a dispose function"
    );
  }

  try {
    while (true) {
      yield stale ? ((stale = false), value) : new Promise((_) => (resolve = _));
    }
  } finally {
    if (dispose != null) {
      dispose();
    }
  }
}
