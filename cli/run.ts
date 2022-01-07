import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { join, parse } from 'path';
import { CubismoError } from '../errors/Errors';
import { CubismoSettings } from '../core/types';
import Cubismo from '../core/Cubismo';
import Logger from '../common/Logger';

type CLIOptions = {
  config: string
  host ?: string 
  port ?: string 
  app  ?: string
}

type CubismoInstance = {
  pid: number,
  workDir: string,
  host: string,
  port: number
}

export async function run(options: CLIOptions): Promise<void> {

  let pathToConfig = join(process.cwd(), options.config);
  if(!existsSync(pathToConfig) || statSync(pathToConfig).isDirectory()) {
    pathToConfig = join(pathToConfig, 'cubismo.config')
    if(!existsSync(pathToConfig)) {
      throw new CubismoError(`Can't find config file ${pathToConfig}`);
    }
  }

  let config: CubismoSettings;
  try {
    config = JSON.parse(readFileSync(pathToConfig, 'utf-8'));
  } catch (error) {
    throw new CubismoError(`Can't read config file from ${pathToConfig}`);
  }

  config.host = options.host || config.host;
  config.port = Number(options.port || config.port);

  const cubismo = new Cubismo(config);
  try {
    await cubismo.start(options.app);
    const instance = {
      pid: process.pid,
      workDir: parse(pathToConfig).dir,
      host: config.host,
      port: config.port
    }
    const pathToRegisterFile = getRegisterFile();
    registerInstance(instance, pathToRegisterFile);
  } catch (error) {
    Logger.warn(error.message);
  }
}

export function registerInstance(instance: CubismoInstance, pathToRegisterFile: string): void {
 
  let instancies: CubismoInstance[];
  if(existsSync(pathToRegisterFile)) {
    try {
      instancies = JSON.parse(readFileSync(pathToRegisterFile, 'utf-8'));
    } catch(error) {
      Logger.warn(`Can't parse file with cubismo instancies: ${error}`);
    }
  } else {
    instancies = [];
  }

  instancies.push(instance);

  try {
    writeFileSync(pathToRegisterFile, JSON.stringify(instancies));
  } catch (error) {
    Logger.warn(`Can't write cubismo instancies file: ${error}`);
  }
}

export function listInstancies() {

  const pathToRegisterFile = getRegisterFile();
  let instancies: CubismoInstance[];
  if(existsSync(pathToRegisterFile)) {
    try {
      instancies = JSON.parse(readFileSync(pathToRegisterFile, 'utf-8'));
    } catch(error) {
      Logger.warn(`Can't parse file with cubismo instancies: ${error}`);
    }
  } else {
    instancies = [];
  }

  const running: CubismoInstance[] = [];
  for(let instance of instancies) {
    if(isProcessRunning(instance.pid)) {
      running.push(instance);
    }
  }

  try {
    writeFileSync(pathToRegisterFile, JSON.stringify(running));
  } catch (error) {
    Logger.warn(`Can't write cubismo instancies file: ${error}`);
  }

  if(!running.length) {
    console.log(`There is no running cubismo instancies`);
  } else {
    console.log(`Process ID\tHost\t\tPort`);
    for(let instance of running) {
      console.log(`${instance.pid}\t\t${instance.host}\t${instance.port}`);
    }
  }
}

function isProcessRunning(pid: number) {
  
  try {
    process.kill(pid, 0);
    return true;
  } catch(error) {
    return false;
  }
}

function getAppDataDir(): string {

  const appDataDir = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME)
  const cubismoDir = join(appDataDir, '.cubismo')

  if(!existsSync(cubismoDir)) {
    mkdirSync(cubismoDir, { recursive: true });
  }

  return cubismoDir;
}

function getRegisterFile(): string {

  return join(getAppDataDir(), 'instancies.json');
}