export async function* now() {
  while (true) {
    yield Date.now();
  }
}
