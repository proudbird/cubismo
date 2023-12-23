import { existsSync } from "node:fs";
import { join } from "node:path";

export function getAppMemberFileName(path: string, name: string): string | undefined {
  let filename: string;

  for(let extension of ['ts', 'js']) {
    const searchPath = join(path, `${name}.${extension}`);
    if(existsSync(searchPath)) {
      filename = searchPath;
      return filename;
    }
  }
}