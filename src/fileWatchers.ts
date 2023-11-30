import {type FSWatcher, existsSync, watch} from "node:fs";
import {Loader} from "./dataloader.js";
import {isEnoent} from "./error.js";
import {maybeStat} from "./files.js";
import {resolvePath} from "./url.js";

export class FileWatchers {
  private readonly watchers: FSWatcher[] = [];

  static async of(root: string, path: string, names: string[], callback: (name: string) => void) {
    const that = new FileWatchers();
    const {watchers} = that;
    for (const name of new Set(names)) {
      const exactPath = resolvePath(root, path, name);
      const watchPath = existsSync(exactPath) ? exactPath : Loader.find(root, resolvePath(path, name))?.path;
      if (!watchPath) continue;
      let currentStat = await maybeStat(watchPath);
      let watcher: FSWatcher;
      const index = watchers.length;
      try {
        watcher = watch(watchPath, async function watched(type) {
          // Re-initialize the watcher on the original path on rename.
          if (type === "rename") {
            watcher.close();
            try {
              watcher = watchers[index] = watch(watchPath, watched);
            } catch (error) {
              if (!isEnoent(error)) throw error;
              console.error(`file no longer exists: ${path}`);
              return;
            }
            setTimeout(() => watched("change"), 100); // delay to avoid a possibly-empty file
            return;
          }
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
      watchers[index] = watcher;
    }
    return that;
  }

  close() {
    this.watchers.forEach((w) => w.close());
    this.watchers.length = 0;
  }
}
