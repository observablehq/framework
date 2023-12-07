export async function* queue(initialize) {
  let resolve;
  const values = [];

  const dispose = initialize((x) => {
    values.push(x);
    if (resolve) resolve(values.shift()), (resolve = null);
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
      yield values.length ? values.shift() : new Promise((_) => (resolve = _));
    }
  } finally {
    if (dispose != null) {
      dispose();
    }
  }
}
