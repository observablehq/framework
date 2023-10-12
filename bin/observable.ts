#!/usr/bin/env -S node --loader tsx/esm
import {readFileSync} from "node:fs";

const command = process.argv.splice(2, 1)[0];

switch (command) {
  case "build":
    import("../src/build.js");
    break;
  case "preview":
    import("../src/preview.js");
    break;
  case "version":
  case "-v":
    console.log(version());
    break;
  case "help":
  case "-h":
  default:
    console.error(`Usage: observable <command>`);
    console.error(`   build\tgenerate a static site`);
    console.error(`   preview\trun the live preview server`);
    console.error(`   help (-h)\tshow this help`);
    console.error(`   version (-v)\tshow version`);
    process.exit(1);
    break;
}

function version() {
  const meta = JSON.parse(readFileSync("package.json", "utf-8"));
  return `${meta.name} ${meta.version}`;
}
