import {readFile} from "node:fs/promises";
import {join} from "node:path/posix";
import {getCurrentAgent, mockAgent} from "./undici.js";

interface JsrPackageInfo {
  "dist-tags": Record<string, string>;
  versions: Record<string, {version: string; dist: {tarball: string}}>;
}

const packages: [name: string, JsrPackageInfo][] = [
  [
    "@std/random",
    {
      "dist-tags": {
        latest: "0.1.0"
      },
      versions: {
        "0.1.0": {version: "0.1.0", dist: {tarball: "https://npm.jsr.io/~/11/@jsr/std__random/0.1.0.tgz"}}
      }
    }
  ]
];

export function mockJsr() {
  mockAgent();
  before(async () => {
    const agent = getCurrentAgent();
    const npmClient = agent.get("https://npm.jsr.io");
    for (const [name, pkg] of packages) {
      npmClient
        .intercept({path: `/@jsr/${name.replace(/^@/, "").replace(/\//, "__")}`, method: "GET"})
        .reply(200, pkg, {headers: {"content-type": "application/json; charset=utf-8"}})
        .persist(); // prettier-ignore
      for (const version of Object.values(pkg.versions)) {
        if (!version.dist.tarball.startsWith("https://npm.jsr.io")) continue;
        npmClient
          .intercept({path: version.dist.tarball.slice("https://npm.jsr.io".length), method: "GET"})
          .reply(200, async () => readFile(join("test/input/jsr", name.replace(/^@/, "").replace(/\//, "__"), version.version + ".tgz")), {headers: {"content-type": "application/octet-stream"}})
          .persist(); // prettier-ignore
      }
    }
  });
}
