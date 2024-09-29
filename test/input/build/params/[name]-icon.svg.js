import {parseArgs} from "node:util";

const {
  values: {name}
} = parseArgs({
  options: {name: {type: "string"}}
});

process.stdout.write(`<svg width="200" height="40" fill="#000000" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <text x="50%" y="50%" dy="0.35em" text-anchor="middle">${name}</text>
</svg>
`);
