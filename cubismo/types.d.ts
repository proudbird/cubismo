import { MetaDataClassDefinitions } from '../classes/MetaData';
import Application from '../classes/application/Application';

export declare type CubismoSettings = {
  port: number
}

export declare type Applications = {
  application: Application,
  settings   : ApplicationSettings,
  cubes      : string[],
  mdStructure: MetaDataClassDefinitions,
  enums      : EnumStore,
  [key: string]: any
}

export declare type ApplicationSettings = {
  dirname: string,
  workspace: string,
  dbconfig: {
      database: string,
      username: string,
      password: string,
      options: {
          host: string,
          dialect: string,
          logging: string,
          operatorsAliases: number,
          charset: string,
          collate: string
      }
  }
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