import { MetaDataClassDefinitions } from '../classes/MetaData';
import Application from '../classes/application/Application';
import { ConnectionConfig } from '../database/types';
import Sequelize from 'sequelize';

export declare type CubismoSettings = {
  port: number,
  connection: {
    host: string,
    port: number,
    database: string,
    username: string,
    password: string
  },
  defaults: {
    applications: {
      root: string,
      workspaces: string
    },
    database: {
      host: string,
      port: number,
      database: string,
      username: string,
      password: string
    }
  },
  templates: {
    [id: string]: {
      dirname: string
    }
  }
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
  dbConfig: any
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

export declare type NewApplicationParameters = {
  id: string,
  dbConfig: ConnectionConfig,
  template: string,
  user: {
    name: string,
    login: string,    
    email: string,    
    password: string
  }
}

export declare type Environments = {
  [key: string]: string | number
}
