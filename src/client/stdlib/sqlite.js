// https://github.com/sql-js/sql.js/issues/284
const exports = {};
const response = await fetch("https://cdn.jsdelivr.net/npm/sql.js/dist/sql-wasm.js");
new Function("exports", await response.text())(exports);
export default await exports.Module({locateFile: (name) => `https://cdn.jsdelivr.net/npm/sql.js/dist/${name}`});
