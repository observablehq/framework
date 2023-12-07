const [arrow, d3] = await Promise.all([
  fetch("https://unpkg.com/apache-arrow/package.json")
    .then((d) => d.json())
    .then((d) => d.version),

  fetch("https://unpkg.com/d3/package.json")
    .then((d) => d.json())
    .then((d) => d.version)
]);

process.stdout.write(JSON.stringify({arrow, d3}, null, 2));
