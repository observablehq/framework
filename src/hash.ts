import {createHash} from "node:crypto";

export function computeHash(source: string | Buffer): string {
  return createHash("sha256").update(source).digest("hex");
}
