import {parseArgs} from "node:util";

const {
  values: {dir, file}
} = parseArgs({
  options: {dir: {type: "string"}, file: {type: "string"}}
});

console.log(JSON.stringify({dir, file}));
