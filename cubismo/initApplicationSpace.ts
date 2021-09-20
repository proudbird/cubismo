import { mkdirSync } from "fs";
import fse from "fs-extra";

export default async function initApplicationSpace(templateDir: string, appDirname: string, appWorkspace: string): Promise<undefined | Error> {

  try {
    mkdirSync(appDirname);
  } catch(error) {
    return new Error(`Can't create application folder: ${error}`);
  }

  try {
    await fse.copy(templateDir, appDirname);
  } catch(error) {
    return new Error(`Can't copy template files to application folder: ${error}`);
  }
  
  try {
    mkdirSync(appWorkspace);
  } catch(error) {
    return new Error(`Can't create application workspace folder: ${error}`);
  }
  
  return undefined;
}