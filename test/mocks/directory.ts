import { exec } from "child_process";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path/posix";
import { promisify } from "util";

export function mockIsolatedDirectory({ git }: { git: boolean; }) {
  let dir: string;
  let cwd: string;
  beforeEach(async () => {
    cwd = process.cwd();
    dir = await mkdtemp(join(tmpdir(), "framework-test-"));
    process.chdir(dir);
    if (git) {
      const {stdout, stderr} = (await promisify(exec)("git init"));
      console.log({stdout, stderr});
    };
  });

  afterEach(async () => {
    process.chdir(cwd);
    await rm(dir, { recursive: true });
  });
}
