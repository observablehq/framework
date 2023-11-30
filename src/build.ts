import {existsSync} from "node:fs";
import {access, constants, copyFile, readFile, writeFile} from "node:fs/promises";
import {basename, dirname, join, relative} from "node:path";
import {cwd} from "node:process";
import {fileURLToPath} from "node:url";
import {readConfig} from "./config.js";
import {Loader} from "./dataloader.js";
import {isEnoent} from "./error.js";
import {prepareOutput, visitFiles, visitMarkdownFiles} from "./files.js";
import {createImportResolver, rewriteModule} from "./javascript/imports.js";
import {renderServerless} from "./render.js";
import {makeCLIResolver} from "./resolver.js";
import {getClientPath, getIntegrationPath, rollupClient, rollupIntegration} from "./rollup.js";
import {resolvePath} from "./url.js";

const EXTRA_FILES = new Map([["node_modules/@observablehq/runtime/dist/runtime.js", "_observablehq/runtime.js"]]);

export interface BuildOptions {
  sourceRoot: string;
  outputRoot?: string;
  output?: BuildOutput | null;
  verbose?: boolean;
  addPublic?: boolean;
  addIntegrationListener?: null | {origin: string};
}

export interface BuildOutput {
  /**
   * @param outputPath The path of this file relative to the outputRoot. For
   *   example, in a local build this should be relative to the dist directory. */
  copyFile: (sourcePath: string, outputPath: string, clientAction?: string) => Promise<void>;
  /**
   * @param outputPath The path of this file relative to the outputRoot. For
   *   example, in a local build this should be relative to the dist directory. */
  writeFile: (outputPath: string, contents: Buffer | string, clientAction: string) => Promise<void>;
}

export async function build({
  sourceRoot,
  outputRoot,
  verbose = true,
  output = outputRoot === undefined ? null : new DefaultOutput(outputRoot, {verbose}),
  addPublic = true,
  addIntegrationListener = null
}: BuildOptions): Promise<void> {
  if (!output)
    throw new Error("Either `output` must be specified, or `outputRoot` specified and `output` left as default.");
  // Make sure all files are readable before starting to write output files.
  for await (const sourceFile of visitMarkdownFiles(sourceRoot)) {
    await access(join(sourceRoot, sourceFile), constants.R_OK);
  }

  // Render .md files, building a list of file attachments as we go.
  const config = await readConfig(sourceRoot);
  const files: string[] = [];
  const imports: string[] = [];
  const resolver = await makeCLIResolver();
  for await (const sourceFile of visitMarkdownFiles(sourceRoot)) {
    const sourcePath = join(sourceRoot, sourceFile);
    const outputPath = join(dirname(sourceFile), basename(sourceFile, ".md") + ".html");
    const path = join("/", dirname(sourceFile), basename(sourceFile, ".md"));
    const render = await renderServerless(await readFile(sourcePath, "utf-8"), {
      root: sourceRoot,
      path,
      resolver,
      addIntegrationListener,
      ...config
    });
    const resolveFile = ({name}) => resolvePath(sourceFile, name);
    files.push(...render.files.map(resolveFile));
    imports.push(...render.imports.filter((i) => i.type === "local").map(resolveFile));
    await output.writeFile(outputPath, render.html, `render ${sourcePath}`);
  }

  if (addPublic) {
    // Generate the client bundle.
    const clientPath = getClientPath();
    const clientcode = await rollupClient(clientPath, {minify: true});
    await output.writeFile(join("_observablehq", "client.js"), clientcode, `bundle ${clientPath}`);
    // integration with observablehq.com
    if (addIntegrationListener) {
      const integrationPath = getIntegrationPath();
      const integrationCode = await rollupIntegration(integrationPath, addIntegrationListener.origin, {minify: true});
      await output.writeFile(join("_observablehq", "integration.js"), integrationCode, `bundle ${integrationPath}`);
    }
    // Copy over the public directory.
    const publicRoot = relative(cwd(), join(dirname(fileURLToPath(import.meta.url)), "..", "public"));
    for await (const publicFile of visitFiles(publicRoot)) {
      const sourcePath = join(publicRoot, publicFile);
      const outputPath = join("_observablehq", publicFile);
      await output.copyFile(sourcePath, outputPath);
    }
  }

  // Copy over the referenced files.
  for (const file of files) {
    let sourcePath = join(sourceRoot, file);
    const outputPath = join("_file", file);
    if (!existsSync(sourcePath)) {
      const loader = Loader.find(sourceRoot, file);
      if (!loader) {
        if (verbose) console.error("missing referenced file", sourcePath);
        continue;
      }
      try {
        sourcePath = join(sourceRoot, await loader.load({verbose}));
      } catch (error) {
        if (!isEnoent(error)) throw error;
        continue;
      }
    }
    await output.copyFile(sourcePath, outputPath);
  }

  // Copy over the imported modules.
  const importResolver = createImportResolver(sourceRoot);
  for (const file of imports) {
    const sourcePath = join(sourceRoot, file);
    const outputPath = join("_import", file);
    if (!existsSync(sourcePath)) {
      if (verbose) console.error("missing referenced file", sourcePath);
      continue;
    }
    await output.writeFile(
      outputPath,
      rewriteModule(await readFile(sourcePath, "utf-8"), file, importResolver),
      "copy"
    );
  }

  // Copy over required distribution files from node_modules.
  // TODO: Note that this requires that the build command be run relative to the node_modules directory.
  if (addPublic) {
    for (const [sourcePath, targetFile] of EXTRA_FILES) {
      await output.copyFile(sourcePath, targetFile);
    }
  }
}

class DefaultOutput implements BuildOutput {
  verbose: boolean;
  constructor(
    private outputRoot: string,
    {verbose}: {verbose: boolean}
  ) {
    this.verbose = verbose;
  }
  async copyFile(sourcePath: string, outputPath: string, clientAction = "copy"): Promise<void> {
    const destination = join(this.outputRoot, outputPath);
    if (this.verbose) console.log(clientAction, sourcePath, "→", outputPath);
    await prepareOutput(destination);
    await copyFile(sourcePath, destination);
  }
  async writeFile(outputPath: string, contents: string | Buffer, clientAction: string): Promise<void> {
    const destination = join(this.outputRoot, outputPath);
    if (this.verbose) console.log(clientAction, "→", destination);
    await prepareOutput(destination);
    await writeFile(destination, contents);
  }
}
