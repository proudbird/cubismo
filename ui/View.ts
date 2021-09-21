import fs           from 'fs'
import path         from 'path'
import EventEmitter from 'events'

import demand    from 'demander'
import Cubismo from '../cubismo/Cubismo'
import Application from '../classes/application/Application'
import Cube from '../classes/Cube'
import MetaDataClass from '../classes/MetaDataClass'
import MetaDataObject from '../classes/MetaDataObject'
import CatalogInstance from '../classes/CatalogInstance'
import Element from './UIElement'
import UIElement from './UIElement'
import initView from './initView'


export default class View extends EventEmitter {
    
  #id      : string
  #name    : string
  #params  : any
  #options : any
  #elements: Map<string, UIElement>

  #cubismo        : Cubismo
  #application    : Application
  #cube           : Cube
  #mdClass        : string
  #mdObject       : string
  #modelDefinition: any

  constructor(
        cubismo: Cubismo, 
        application: Application, 
        cube: Cube,
        mdClass: string,
        mdObject: string,
        modelDefinition: any,
        name: string, 
        params: any, 
        options: any
    ) {

    super()
    this.#id   = Utils.sid()
    this.#name = name

    this.#params  = params
    this.#options = options

    this.#cubismo         = cubismo
    this.#application     = application
    this.#cube            = cube
    this.#mdClass         = mdClass
    this.#mdObject        = mdObject
    this.#modelDefinition = modelDefinition

    this.#elements = new Map()

    const views = cubismo.applications.get(application.id).views
    views[this.#id] = this
  }

  get id(): string {
    return this.#id
  }

  get name(): string {
    return this.#name
  }

  addElement(element: UIElement) {
    this.#elements.set(element.name, element)
    Object.defineProperty(this, element.name, 
      {
        value: element,
        enumerable: true,
        writable: false
      })
  }

  async show() {

    let config: any
    try {
      config = await getViewGonfig(
        this, 
        this.#params, 
        this.#options,
        this.#cubismo.applications.get(this.#application.id).dirname,
        this.#application,
        this.#cube,
        this.#mdClass,
        this.#mdObject,
        this.#options.instance
        )

      initView(this, config, this.#options)
    }catch(error) {
      Logger.error(`Unsuccessful attempt to load view config`, error)
    }
  }
}

async function getViewGonfig(
      view       : View, 
      params     : any, 
      options    : any,
      appDir     : string,
      application: Application,
      cube       : Cube,
      mdClass?   : string,
      mdObject?  : string,
      instance?  : CatalogInstance,
      owner?     : CatalogInstance,
      modelDefinition?: any
    ) {


  const file = [];
  if(mdClass) {
      file.push(mdClass)
      if(mdClass === 'Common') {
          file.push('Views')
      }
  }
  
  if(mdObject) {
      file.push(mdObject)
      file.push('Views')
  }

  file.push(view.name)
  file.push('json')

  let pathToFile = path.join(
      appDir, cube ? cube.name : '', mdClass || '', 
      file.join('.')
  )

  let config: any
  if(!fs.existsSync(pathToFile)) {
    pathToFile = path.join(__dirname, `./DefaultViews/${mdClass}.Views.${view.name}.Config.js`)
    const defaultConfig = require(pathToFile)
    config = defaultConfig.init(view.id, modelDefinition, options)
  } else {
    config = require(pathToFile)
    demand(
      pathToFile.replace('.json', '.js'), 
      view,
      { Application: application, 
        Cube       : cube, 
        Instance   : instance, 
        Owner      : owner }, 
        { hideGlobals: ['all'] }
    )
  }

  return Promise.resolve(config)
}