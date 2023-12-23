import { ApplicationStructure } from '../classes/application/defineAppStructure';
import { MetaDataClassDefinitions } from '../classes/MetaData';
import Application from '../classes/application/Application';
import { ConnectionConfig } from '../database/types';
import Sequelize from 'sequelize';

export type DatabaseOptions = Sequelize.Options

export declare type CubismoSettings = {
  port: number,
  host: string,
  connection: Sequelize.Options | 'none',
  apiKey?: string,
  apiKeyHeader?: string,
  tokenKey?: string,
  cubes: string,
  defaults: {
    workspaces: string,
    connection: {
      host: string,
      port: number,
      dialect: string,
      database?: string,
      username: string,
      password: string
    }
  },
  templates: {
    [id: string]: string[]
  },
  applications?: {
    [id: string]: ApplicationSettings
  }
}

export declare type Applications = {
  application : Application,
  settings   ?: ApplicationSettings,
  cubes      ?: string[],
  mdStructure?: ApplicationStructure,
  enums      ?: EnumStore,
  workspace  ?: string,
  [key: string]: any
}

export declare type ApplicationSettings = {
  workspace: string
  defaultLang: string
  connection: Sequelize.Options | 'none';
  cubes: string[]
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
  workspace: string,
  connection: ConnectionConfig,
  template: string,
  user: {
    name: string,
    login: string,    
    email: string,    
    password: string
  },
  defaultLang: string
}

export declare type Environments = {
  [key: string]: string | number
}

export interface IUser {

  id: string;
  get name(): string;
  set name(value: string);
  get login(): string;
  set login(value: string);
  get email(): string;
  set email(value: string);
  set password(value: string);
  testPassword(value: string): boolean;
  save(): Promise<IUser>;
}
