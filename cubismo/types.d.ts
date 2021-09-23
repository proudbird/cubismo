import { MetaDataClassDefinitions } from '../classes/MetaData';
import Application from '../classes/application/Application';
import { ConnectionConfig } from '../database/types';

export declare type CubismoSettings = {
  port: number
}

export declare type Applications = {
  application : Application,
  settings   ?: ApplicationSettings,
  cubes      ?: string[],
  mdStructure?: MetaDataClassDefinitions,
  enums      ?: EnumStore,
  workspace  ?: string,
  [key: string]: any
}

export declare type ApplicationSettings = {
  dirname: string,
  workspace: string,
  dbconfig: ConnectionConfig
}

declare interface Enum {
  id   : string,
  name : string,
  title: string
}

export declare type EnumStore = {
  [modelId: string]: {
    [enumValueId: string]: Enum
  }
}