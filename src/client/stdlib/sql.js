// https://github.com/sql-js/sql.js/issues/284
const _ = {};
const response = await fetch("https://cdn.jsdelivr.net/npm/sql.js/dist/sql-wasm.js");
new Function("exports", await response.text())(_);
const SQLite = await _.Module({locateFile: (name) => `https://cdn.jsdelivr.net/npm/sql.js/dist/${name}`});

export default SQLite;
