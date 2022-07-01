import Cubismo        from '../core/Cubismo'
import Application    from './application/Application'
import Cube           from './Cube'
import MetaDataObject from './MetaDataObject'
import { MetaDataClassDefinition } from './MetaData'
import MetaDataClass from './MetaDataClass'

import addElement from './addElement'

export default class DatSets extends MetaDataClass {

  #cubismo     : Cubismo
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
      cubismo,
      application, 
      cube, 
      type,
      name, 
      dirname, 
      filename
    )

    this.#cubismo     = cubismo
    this.#application = application
    this.#elements    = new Map()
    this.#cache       = new Map()
  }

  addObject(element: IMetaDataObject, fileName: string): IMetaDataObject {
    return addElement(element, this, this.#cubismo, this.#application, this.#elements, this.#cache, fileName);
  } 
}

