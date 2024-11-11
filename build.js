import {parseArgs} from "node:util";
import {build} from "esbuild";
import {glob} from "glob";

const {values, positionals} = parseArgs({
  allowPositionals: true,
  options: {
    outdir: {type: "string", default: "build"},
    outbase: {type: "string"},
    ignore: {type: "string", multiple: true},
    sourcemap: {type: "boolean"}
  }
});

await build({
  entryPoints: await glob(positionals, {ignore: values.ignore}),
  define: {"process.env.npm_package_version": `"${process.env.npm_package_version}"`},
  outdir: values.outdir,
  outbase: values.outbase,
  platform: "node",
  sourcemap: values.sourcemap ? "linked" : false,
  format: "esm",
  logLevel: "info"
});
