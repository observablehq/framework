#!/usr/bin/env -S node --loader tsx/esm

const command = process.argv.splice(2, 1)[0];

switch (command) {
  case "-v":
  case "--version": {
    import("../package.json").then(({version}: any) => console.log(version));
    break;
  }
  case "build":
    import("../src/build.js");
    break;
  case "preview":
    import("../src/preview.js");
    break;
  case "login":
    import("../src/login.js");
    break;
  default:
    console.error(`Usage: observable <command>`);
    console.error(`   build\tgenerate a static site`);
    console.error(`   preview\trun the live preview server`);
    console.error(`   login\tauthenticate with the Observable Cloud`);
    console.error(` --version\tprint the version`);
    process.exit(1);
    break;
}
