import EventEmitter from 'events'
import path from 'path'
import loadModule from '../loadModule'

import DBDriver from '../../database/DBDriver';
import Query from '../../database/Query';

import Cubismo     from '../../cubismo'
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
import Collection     from '../Collection'
import CollectionItem from '../CollectionItem'
import { MetaDataClassDefinition } from '../MetaData'
import { MetaDataClassDefinitions } from '../MetaData'

import defineAppStructure   from './defineAppStructure'
import defineModelStructure from './defineModelStructure'
import syncDBStructure from '../../database/syncDBStructure'

import { Sequelize } from 'sequelize'
import { ConnectionConfig } from '../../database/types'

import addElement from '../addElement'
import getListOfCubes from './getListOfCubes';
import loadMetaDataModules from './loadMetaDataModules';

let workspaceDir: string

export type AppSettings = {
  id       : string,
  dirname  : string,
  filename : string,
  dbconfig : ConnectionConfig,
  workspace: string
}

export default class Application extends EventEmitter implements IApplication  {

  #id       : string
  #settings : AppSettings
  #cubismo  : Cubismo
  #cubes    : Cubes
  #elements : Map<string, [Cube, string]>
  #cache    : Map<string, [number, any]>
  #mdClasses: MetaDataClassDefinitions
  #dbDriver : DBDriver
  #views    : View[]
  #workspace: string

  Query: Query

  constructor(settings: AppSettings, cubismo: Cubismo) {

    super()
      
    this.#settings = settings
    this.#id       = settings.id
    this.#cubismo  = cubismo
    this.#elements = new Map()
    this.#cache    = new Map()
    this.#dbDriver = new DBDriver(settings.dbconfig)
    this.#settings = settings
    this.#mdClasses= new Map()
    this.#cubes    = new Cubes(cubismo, this)

    this.#workspace = workspaceDir = settings.workspace

    this.Query = new Query(this, this.#dbDriver.connection);
     
    cubismo.applicationCubes.set(this.#id, getListOfCubes(this.#settings.dirname));

    const defaultTypes = {
      Cube    : addMetaDataClassDefinition(this.#mdClasses, 'Cube'    , 'Cube'   , Cube   ),
      Modules : addMetaDataClassDefinition(this.#mdClasses, 'Modules' , 'Module' , Modules , Module),
      Catalogs: addMetaDataClassDefinition(this.#mdClasses, 'Catalogs', 'Catalog', Catalogs, Catalog, CatalogInstance),
      DataSets: addMetaDataClassDefinition(this.#mdClasses, 'DataSets', 'DataSet', DataSets, DataSet, DataSetRecord),
      Enums   : addMetaDataClassDefinition(this.#mdClasses, 'Enums'   , 'Enum'   , Enums   , Enum),
      Collections: addMetaDataClassDefinition(this.#mdClasses, 'Collections', 'Collection', undefined, Collections, CollectionItem)
    }

    this.once('initialize', () => {
      initApp(this, settings, this.#cubismo, defaultTypes)
    })

    this.once('appStructureLoaded', (modelStructure, applicationStructure) => {
      defineModelStructure(cubismo, this,  this.#dbDriver.connection, modelStructure, defaultTypes);
      loadMetaDataModules(cubismo, this, applicationStructure);
    })

    const dbDriver = this.#dbDriver
    this.once('modelStructureLoaded', () => {
      syncDBStructure(this, dbDriver)
    })

    this.once('dataBaseSynchronized', () => {
      onStart(this);
      this.emit('initialized', defaultTypes)
    })

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

function initApp(application: Application, appSettings: AppSettings, cubismo: Cubismo, defaultTypes: any): void {

  try {
    const {modelStructure, applicationStructure} = defineAppStructure(
          cubismo,
          application, 
          appSettings,
          defaultTypes)

    application.emit('appStructureLoaded', modelStructure, applicationStructure)
    Logger.debug(`Application <${application.id}> has been initialized`)
  } catch(error) {
    Logger.error("Unsuccessful attempt to define application structure", error)
    undefined;
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