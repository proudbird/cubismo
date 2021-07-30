import Cubismo       from '../cubismo'
import Application   from './Application/Application'
import MetaDataClass from './MetaDataClass'
import { MetaDataClassDefinition } from './MetaData'

import addElement from './addElement'

export default class Cube extends MetaDataClass {

  #application : Application
  #elements    : Map<string, [Cube, string]>
  #cache       : Map<string, [number, any]>

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
    this.#elements    = new Map()
    this.#cache       = new Map()
  }

  addClass(element: IMetaDataClass, fileName: string): IMetaDataClass {
    return addElement(element, this, this.#application, this.#elements, this.#cache, fileName)
  } 
}