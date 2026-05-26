import {existsSync, writeFileSync} from "node:fs";
const testFile = "./test/output/build/chain-changed/.ignoreme";

const x = existsSync(testFile) ? 0 : 3;

try {
  writeFileSync(testFile, "—");
} catch (error) { }

process.stdout.write(JSON.stringify({ x }));
