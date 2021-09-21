import EventEmitter from 'events'
import path from 'path'

import DBDriver from '../../database/DBDriver';
import Query from '../../database/queries/Query';

import Cubismo     from '../../cubismo/Cubismo'
import Cubes       from '../Cubes'
import Cube        from '../Cube'
import Modules     from '../Modules'
import Module      from '../Module'
import Catalogs    from '../Catalogs'
import Catalog     from '../Catalog'
import DataSets    from '../DataSets'
import DataSet     from '../DataSet'
import DataSetRecord from '../DataSetRecord'
import Enums    from '../Enums'
import Enum     from '../Enum'
import CatalogInstance from '../CatalogInstance'
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
import { ApplicationSettings } from '../../cubismo/types';

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
  #views    : View[]
  #workspace: string
  users: Users;
  Query: Query

  constructor(id: string, settings: ApplicationSettings, cubismo: Cubismo, onReady: Function) {
    
    this.#settings = settings
    this.#id       = id
    this.#cubismo  = cubismo
    this.#elements = new Map()
    this.#cache    = new Map()
    this.#dbDriver = new DBDriver(settings.dbconfig);
    this.#settings = settings
    this.#mdClasses= new Map()
    this.#cubes    = new Cubes(cubismo, this)

    this.#workspace = workspaceDir = settings.workspace;

    this.Query = new Query(this, this.#dbDriver.connection);

    const defaultTypes = {
      Cube    : addMetaDataClassDefinition(this.#mdClasses, 'Cube'    , 'Cube'   , Cube   ),
      Modules : addMetaDataClassDefinition(this.#mdClasses, 'Modules' , 'Module' , Modules , Module),
      Catalogs: addMetaDataClassDefinition(this.#mdClasses, 'Catalogs', 'Catalog', Catalogs, Catalog, CatalogInstance),
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
        loadMetaDataModules(cubismo, this, applicationStructure); 
        resolve({ error: null, mdStructure: applicationStructure }); 
      } catch (error) {
        reject({ error: new Error(`Can't initialize application '${this.#id}': ${error.message}`)});
      }

      onStart(this);
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
  
  workspace(fileName: string): string {
    return path.join(workspaceDir, fileName)
  } 
}

function onStart(application: Application) {
  if(application['onStart']) {
    application['onStart']();
  }

  for(let cube of application.cubes) {
    if(cube['onStart']){
      cube['onStart']();
    }
  }
}