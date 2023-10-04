#!/usr/bin/env node --loader tsx/esm

const command = process.argv.splice(2, 1)[0];

switch (command) {
  case "build":
    import("../src/build.js");
    break;
  case "preview":
    import("../src/preview.js");
    break;
  default:
    console.error(`Usage: observable <command>`);
    console.error(`   build\tgenerate a static site`);
    console.error(`   preview\trun the live preview server`);
    process.exit(1);
    break;
}
