import {exec} from "child_process";
import {mkdtemp, rm} from "fs/promises";
import {tmpdir} from "os";
import {join} from "path/posix";
import {promisify} from "util";
// import {rimraf} from "rimraf";

export function mockIsolatedDirectory({git}: {git: boolean}) {
  let dir: string;
  let cwd: string;
  beforeEach(async () => {
    cwd = process.cwd();
    dir = await mkdtemp(join(tmpdir(), "framework-test-"));
    process.chdir(dir);
    if (git) {
      console.log("logging stdout, stderr");
      const a = await promisify(exec)(
        'git config --global user.email "observable@example.com" && git config --global user.name "Observable User" && git config --global init.defaultBranch main'
      );
      console.log(a.stdout, a.stderr);
      const b = await promisify(exec)("git init");
      console.log(b.stdout, b.stderr);
    }
  });

  afterEach(async () => {
    process.chdir(cwd);
    // await rimraf(dir);
    await rm(dir, {recursive: true}); //, force: true
  });
}
