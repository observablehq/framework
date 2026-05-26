const {FILE_SERVER} = process.env;
const {x} = await fetch(`${FILE_SERVER}chain-source.json`).then((response) => response.json());
process.stdout.write(JSON.stringify({x, "x^2": x * x}, null, 2));
