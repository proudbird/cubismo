import Cubismo       from '../core/Cubismo'
import Application   from './Application/Application'
import MetaDataClass from './MetaDataClass'
import { MetaDataClassDefinition } from './MetaData'

import addElement from './addElement'
import i18next from 'i18next'
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'

export default class Cube extends MetaDataClass {

  #cubismo     : Cubismo
  #application : Application
  #elements    : Map<string, [Cube, string]>
  #cache       : Map<string, [number, any]>
  #cube        : Cube
  #dirname     : string

  constructor(
    cubismo    : Cubismo,
    application: Application, 
    cube       : Cube, 
    type       : MetaDataClassDefinition,
    name       : string, 
    dirname    : string, 
    filename   : string
  ) {

    super(
      cubismo    ,
      application, 
      cube       , 
      type       ,
      name       , 
      dirname    , 
      filename   
    )

    this.#application = application
    this.#cube        = this
    this.#elements    = new Map()
    this.#cache       = new Map();
    this.#dirname     = dirname;
  }

  get cube(): Cube {
    return this.#cube;
  }

  addClass(element: IMetaDataClass, fileName: string): IMetaDataClass {
    return addElement(element, this, this.#cubismo, this.#application, this.#elements, this.#cache, fileName)
  } 

  t(key: string) {
    return i18next.t(key, { ns: this.name });
  }
}