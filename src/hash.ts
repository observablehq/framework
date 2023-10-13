import {createHash} from "node:crypto";

export function computeHash(source: string): string {
  return createHash("sha256").update(source).digest("hex");
}
