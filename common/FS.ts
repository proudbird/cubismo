import fs from "fs";
import fsp from "fs/promises";
import path from "path";

export default class FS {

  #workspace: string;

  constructor(workspace: string) {
    this.#workspace = workspace;
  }

  existsSync(fileName: string): boolean {
    try {
      return fs.existsSync(path.join(this.#workspace, fileName));
    } catch(error) {
      throw new Error(`Can't read file '${fileName}'`);
    }
  }

  readFileSync(fileName: string, encoding?: 'utf-8'): string {
    try {
      encoding = encoding || 'utf-8';
      return fs.readFileSync(path.join(this.#workspace, fileName), encoding);
    } catch(error) {
      throw new Error(`Can't read file '${fileName}'`);
    }
  }

  async readFile(fileName: string, encoding?: 'utf-8'): Promise<string> {
    try {
      encoding = encoding || 'utf-8';
      return fsp.readFile(path.join(this.#workspace, fileName), encoding);
    } catch(error) {
      throw new Error(`Can't read file '${fileName}'`);
    }
  }
  
  writeFileSync(fileName: string, data: string, encoding?: 'utf-8'): void {
    try {
      encoding = encoding || 'utf-8';
      fs.writeFileSync(path.join(this.#workspace, fileName), data, encoding);
    } catch(error) {
      throw new Error(`Can't write file '${fileName}'`);
    }
  }
}
