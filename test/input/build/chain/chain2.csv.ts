const {FILE_SERVER} = process.env;
const {x} = await fetch(`${FILE_SERVER}chain-source.json`).then((response) => response.json());
console.log(`name,value\nx,${x}\nx^2,${x * x}`);
