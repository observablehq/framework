import {type FSWatcher, existsSync, watch} from "node:fs";
import {Loader} from "./dataloader.js";
import {isEnoent} from "./error.js";
import {maybeStat} from "./files.js";
import {resolvePath} from "./url.js";

export class FileWatchers {
  private readonly watchers: FSWatcher[] = [];

  static async of(root: string, path: string, names: string[], callback: (name: string) => void) {
    const watchers = new FileWatchers();
    for (const name of new Set(names)) {
      const exactPath = resolvePath(root, path, name);
      const watchPath = existsSync(exactPath) ? exactPath : Loader.find(root, resolvePath(path, name))?.path;
      if (!watchPath) continue;
      let currentStat = await maybeStat(watchPath);
      let watcher: FSWatcher;
      try {
        watcher = watch(watchPath, async () => {
          const newStat = await maybeStat(watchPath);
          // Ignore if the file was truncated or not modified.
          if (currentStat?.mtimeMs === newStat?.mtimeMs || newStat?.size === 0) return;
          currentStat = newStat;
          callback(name);
        });
      } catch (error) {
        if (!isEnoent(error)) throw error;
        continue;
      }
      watchers.watchers.push(watcher);
    }
    return watchers;
  }

  close() {
    this.watchers.forEach((w) => w.close());
    this.watchers.length = 0;
  }
}
