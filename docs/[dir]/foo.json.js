import {parseArgs} from "node:util";

const {
  values: {dir}
} = parseArgs({
  options: {dir: {type: "string"}}
});

console.log(JSON.stringify({dir}));
