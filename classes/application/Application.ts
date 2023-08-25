import EventEmitter from 'events'
import path from 'path'

import iconv from 'iconv-lite';

import DBDriver from '../../database/DBDriver';
import Query from '../../database/queries/Query';

import Cubismo     from '../../core/Cubismo'
import Cubes       from '../Cubes'
import Cube        from '../Cube'
import Modules     from '../Modules'
import Module      from '../Module'
import Constants from '../Constants';
import Constant from '../Constant';
import ConstantValue from '../ConstantValue';
import Catalogs    from '../Catalogs'
import Catalog     from '../Catalog'
import CatalogInstance from '../CatalogInstance'
import Registrators    from '../Registrators'
import Registrator     from '../Registrator'
import RegistratorInstance from '../RegistratorInstance'
import DataSets    from '../DataSets'
import DataSet     from '../DataSet'
import DataSetRecord from '../DataSetRecord'
import Enums    from '../Enums'
import Enum     from '../Enum'
import Collections    from '../Collections'
import CollectionItem from '../CollectionItem'
import { MetaDataClassDefinition } from '../MetaData'
import { MetaDataClassDefinitions } from '../MetaData'

import defineAppStructure   from './defineAppStructure'
import defineModelStructure from './defineModelStructure'
import syncDBStructure from '../../database/syncDBStructure'

import { ConnectionConfig } from '../../database/types'

import addElement from '../addElement'
import getListOfCubes from './getListOfCubes';
import loadMetaDataModules from './loadMetaDataModules';
import initSystemTables from './initSystemTables';
import { Users } from '../../database/system/users';
import { ApplicationSettings, Environments } from '../../core/types';
import { fstat } from 'fs-extra';
import FS from '../../common/FS';
import Dictionary from '../../common/Dictionary';
import i18next from 'i18next';

let workspaceDir: string;

export default class Application implements IApplication  {

  #id       : string
  #settings : ApplicationSettings
  #cubismo  : Cubismo
  #cubes    : Cubes
  #elements : Map<string, [Cube, string]>
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
    this.#mdClasses= new Map()
    this.#cubes    = new Cubes(cubismo, this);

    this.#api      = new Map();
    this.#dictionary = new Dictionary(settings);


    this.fs = new FS(this.#settings.workspace);

    this.#workspace = workspaceDir = settings.workspace;
    this.#defaultLang = settings.defaultLang || 'en';

    this.env = env || {};

    this.Query = new Query(this, this.#dbDriver.connection);

    const defaultTypes = {
      Cube    : addMetaDataClassDefinition(this.#mdClasses, 'Cube'    , 'Cube'   , Cube   ),
      Modules : addMetaDataClassDefinition(this.#mdClasses, 'Modules' , 'Module' , Modules , Module),
      Constants: addMetaDataClassDefinition(this.#mdClasses, 'Constants', 'Constant', Constants, Constant, Constant),
      Catalogs: addMetaDataClassDefinition(this.#mdClasses, 'Catalogs', 'Catalog', Catalogs, Catalog, CatalogInstance),
      Registrators: addMetaDataClassDefinition(this.#mdClasses, 'Registrators', 'Registrator', Registrators, Registrator, RegistratorInstance),
      DataSets: addMetaDataClassDefinition(this.#mdClasses, 'DataSets', 'DataSet', DataSets, DataSet, DataSetRecord),
      Enums   : addMetaDataClassDefinition(this.#mdClasses, 'Enums'   , 'Enum'   , Enums   , Enum),
      Collections: addMetaDataClassDefinition(this.#mdClasses, 'Collections', 'Collection', undefined, Collections, CollectionItem)
    };

    const ready = new Promise(async (resolve, reject) => {
      
      let modelStructure;
      let applicationStructure;
      try {
        const result = defineAppStructure(
          cubismo,
          this, 
          settings,
          defaultTypes);

        modelStructure = result.modelStructure;
        applicationStructure = result.applicationStructure; 
        
        await initSystemTables(this, this.#dbDriver);
        await defineModelStructure(cubismo, this,  this.#dbDriver.connection, modelStructure, defaultTypes);
        await syncDBStructure(this, this.#dbDriver);
        await initInternationalization(this.lang);
        loadMetaDataModules(cubismo, this, applicationStructure); 
        await onStart(this);
        resolve({ error: null, mdStructure: applicationStructure }); 
      } catch (error) {
        const convertedMessage = iconv.decode(error.message, 'win1251');
        error.message = `Can't initialize application '${this.#id}': ${convertedMessage}`
        reject({ error });
      }
    });

    onReady(ready);


    function addMetaDataClassDefinition(metaDataClassDefinitions : Map<string, MetaDataClassDefinition>,
                                        name          : string, 
                                        objectName    : string, 
                                        classMaker    : IMetaDataClass, 
                                        objectMaker?  : IMetaDataObject,
                                        instanceMaker?: IMetaDataInstance
                                     ): MetaDataClassDefinition | undefined {
    
      if(metaDataClassDefinitions.has(name)) {
        throw new Error(`Application already has type '${name}'`)
      }
      
      const definition = new MetaDataClassDefinition(name, objectName, classMaker, objectMaker, instanceMaker)
      metaDataClassDefinitions.set(name, definition)
      
      return definition
    }

  }

  addCube(element: ICube, fileName: string): ICube {
    //@ts-ignore
    return addElement(element, this, this.#cubismo, this,  this.#elements, this.#cache, fileName)
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
      await cube['onStart']();
    }
  }
}

async function initInternationalization(lang: string) {

  i18next.init({
    lng: lang
  });
}