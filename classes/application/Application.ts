import path from 'path'
import iconv from 'iconv-lite';

import DBDriver from '../../database/DBDriver';
import Query from '../../database/queries/Query';

import Cubismo     from '../../core/Cubismo'
import Cubes       from '../Cubes'

import { MetaDataClassDefinitions } from '../MetaData'

import defineAppStructure, { ApplicationStructure, ModelStructure }   from './defineAppStructure'
import defineModelStructure from './defineModelStructure'
import syncDBStructure from '../../database/syncDBStructure'

import initSystemTables from './initSystemTables';
import { Users } from '../../database/system/users';
import { ApplicationSettings, Environments } from '../../core/types';

import FS from '../../common/FS';
import Dictionary from '../../common/Dictionary';
import i18next from 'i18next';
import MetaDataModule from '../MetaDataModule';
import buildDefinitionsFiles from '../../dev/types-builder/buildDefinitionsFiles';
import { watch } from 'chokidar';

import Logger from '../../common/Logger';

let workspaceDir: string;

export default class Application implements IApplication  {

  #id       : string
  #settings : ApplicationSettings
  #cubismo  : Cubismo
  #cubes    : Cubes
  #elements : Map<string, MetaDataModule>
  #cache    : Map<string, [number, any]>
  #mdClasses: MetaDataClassDefinitions
  #dbDriver : DBDriver
  #views    : View[];
  #api      : Map<string, { handler: Function, needAuthenication: boolean }>;
  #workspace: string
  #dictionary: Dictionary;
  env: Environments;
  #users: Users;
  Query: Query
  #defaultLang: string;

  public fs: FS;

  constructor(id: string, settings: ApplicationSettings, env: Environments, cubismo: Cubismo, onReady: Function) {
    
    this.#settings = settings
    this.#id       = id
    this.#cubismo  = cubismo
    this.#elements = new Map()
    this.#cache    = new Map()
    this.#dbDriver = new DBDriver(settings.connection);
    this.#settings = settings
    this.#cubes    = new Cubes({ application: this });

    this.#api      = new Map();
    this.#dictionary = new Dictionary(settings);


    this.fs = new FS(this.#settings.workspace);

    this.#workspace = workspaceDir = settings.workspace;
    this.#defaultLang = settings.defaultLang || 'en';

    this.env = env || {};

    this.Query = new Query(this, this.#dbDriver.connection);

    const ready = new Promise(async (resolve, reject) => {
      
      let modelStructure: ModelStructure;
      let appStructure: ApplicationStructure;
      try {
        const result = defineAppStructure(
          cubismo,
          this, 
          settings);

        modelStructure = result.modelStructure;
        appStructure = result.appStructure; 
        
        if(this.#settings.connection !== 'none') {
          await initSystemTables(this, this.#dbDriver);
          await defineModelStructure(cubismo, this,  this.#dbDriver.connection, modelStructure);
          await syncDBStructure(this, this.#dbDriver);
        }

        await initInternationalization(this.lang);

        if(process.env.NODE_ENV === 'development') {
          const buildTypes = () => buildDefinitionsFiles({ appStructure, modelStructure});

          buildTypes();

          const EXCLUDE_MATCHERS = [
            '**/tsconfig.json',
            '**/*.d.ts',
            '**/_test*',
            '**/Views/**',
            '**/Types/**',
            '**/node_modules/**'
          ];

          watch(cubismo.settings.cubes, { 
            ignored: EXCLUDE_MATCHERS, 
            ignoreInitial: true, 
            awaitWriteFinish: true,
            interval: 500,
          })
            .on('add', (path) => {
              buildTypes();
            })
        
            .on('unlink', (path) => {
              buildTypes();
            })
        
            .on('change', async(path) => {
              buildTypes();
            });
        }

        this.load();
        
        await onStart(this);

        resolve({ error: null, mdStructure: appStructure, dbDriver: this.#dbDriver}); 
      } catch (error) {
        const convertedMessage = iconv.decode(error.message, 'win1251');
        error.message = `Can't initialize application '${this.#id}': ${convertedMessage}`
        reject({ error });
      }
    });

    onReady(ready);
  }

  add({ name, type, element }) {
    if(this.#elements.has(name)) {
      throw new Error(`Application '${this.#id}' already has ${type} '${name}'`)
    }
  
    this.#elements.set(name, element);
  
    Object.defineProperty(this, element.name, {
      value: element,
      enumerable: true,
      writable: false,
    })
  
    return element;
  }

  load(): void {
    for(let [_, module] of this.#elements) {
      module && module.load && module.load();
    }
  }

  get id(): string {
      return this.#id
  }

  get cubes(): Cubes {
      return this.#cubes
  }

  get window (): any {
      return this.#views[process.env.WINDOW]
  }

  get lang(): string {
      return process.env.USERLANG || 'ru'
  } 

  get defaultLang(): string {
    return this.#defaultLang;
} 

  translate(article: string, locale?: string): string {
    locale = locale || 'ru';
    return this.#dictionary.translate(article, locale);
  }
  
  setApiHandler(request: string, handler: Function, needAuthenication: boolean = true ): void {
    this.#api.set(request, { handler, needAuthenication });
  }

  getApiHandler(request: string): { handler: Function, needAuthenication: boolean } {
    return this.#api.get(request);
  }

  workspace(fileName: string): string {
    return path.join(workspaceDir, fileName)
  } 

  get users() {
    if(!this.#users) {
      this.#users = new Users(this.#dbDriver.connection);
    }

    return this.#users;
  }

  appStructure: any;
}

async function onStart(application: Application) {

  for(let cube of application.cubes) {
    if(cube['onStart']) {
      try {
        await cube['onStart']();
      } catch (error) {
        Logger.error(`Can't run onStart() of cube '${cube.name}': ${error.message}`, error);
      }
    }
  }
}

async function initInternationalization(lang: string) {

  i18next.init({
    lng: lang
  });
}