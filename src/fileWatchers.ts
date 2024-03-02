import {type FSWatcher, existsSync, watch} from "node:fs";
import {join} from "node:path/posix";
import {Loader} from "./dataloader.js";
import {isEnoent} from "./error.js";
import {maybeStat} from "./files.js";
import {resolvePath} from "./path.js";

export class FileWatchers {
  private readonly watchers: FSWatcher[] = [];

  static async of(root: string, path: string, names: Iterable<string>, callback: (name: string) => void) {
    const that = new FileWatchers();
    const {watchers} = that;
    for (const name of names) {
      const filePath = resolvePath(path, name);
      const exactPath = join(root, filePath);
      const watchPath = existsSync(exactPath) ? exactPath : Loader.find(root, filePath)?.path;
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
              console.error(`file no longer exists: ${watchPath}`);
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
