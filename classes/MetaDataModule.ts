import os from 'os';
import Dataroll from 'dataroll';

import Logger from '../common/Logger';
import Utils from '../common/Utils';
import Import from '../core/Import';

import i18next from 'i18next';

import Cubismo from '../core/Cubismo';
import Application  from './application/Application';
import Cube   from './Cube';
import runModule from './runModule';
import { join } from 'path';

interface MetaDataModuleOptions {
  cubismo?: Cubismo;
  application?: Application;
  cube?: Cube;
  type?: string;
  name?: string; 
  filename?: string;
}

export default class MetaDataModule {

  #cubismo: Cubismo;
  #application: Application;
  #cube: Cube;
  #type: string;
  #name: string;
  #filename: string;

  constructor({ cubismo, application, cube, name, type, filename }: MetaDataModuleOptions) {
  
    this.#cubismo = cubismo;
    this.#application = application;
    this.#cube = cube;
    this.#type = type;
    this.#name = name;
    this.#filename = filename;
  }

  get application(): Application {
    return this.#application
  }

  get cube(): Cube {
    return this.#cube;
  }

  get type(): string {
    return this.#type;
  }

  get name(): string {
    return this.#name;
  }

  load(context: any = this): MetaDataModule | void {

    if(!this.#filename) {
      return;
    }

    const params = { 
      Logger,
      Utils,
      Dataroll,
      Application: this.#application,
      Import,
      Workspace: this.#application.workspace,
      me: context
    };

    const cubes = this.#application.cubes; 
    for(let cube of cubes) {
      params[cube.name] = cube;
    }

    const cube = this.#cube || Object.getPrototypeOf(this).constructor.name === 'Cube' && this; 
    if(cube) {
      for(let meteDataClass of this.#application.cubes[cube.name]) {
        params[Object.getPrototypeOf(meteDataClass).constructor.name] = meteDataClass;
      }
      params['Cube'] = cube;
      params['t'] = (key: string) => i18next.t(key, { ns: cube.name });
    }

    const rootDir = this.#cubismo?.settings.cubes;

    try {  
      const loaded = runModule(
        this.#filename, 
        context,         
        params,
        { 
          hideGlobals: ['all'], 
          rootDir,
        }
      );

      for(let key in loaded) {
        Object.defineProperty(context, key, {
          value: loaded[key],
          enumerable: true,
          writable: false,
          configurable: true,
        });
      }

      return context;
    } catch(e) {
      Logger.debug(e);
      return null;
     }
  }
}
