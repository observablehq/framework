#!/usr/bin/env tsx

const command = process.argv.splice(2, 1)[0];

switch (command) {
  case "-v":
  case "--version": {
    import("../package.json").then(({version}: any) => console.log(version));
    break;
  }
  case "build":
    import("../src/build.js").then((build) => build.execute());
    break;
  case "preview":
    import("../src/preview.js");
    break;
  default:
    console.error(`Usage: observable <command>`);
    console.error(`   build\tgenerate a static site`);
    console.error(`   preview\trun the live preview server`);
    console.error(` --version\tprint the version`);
    process.exit(1);
    break;
}

process.exit(0);
