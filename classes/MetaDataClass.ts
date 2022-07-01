import fs     from 'fs'
import demand from 'demander'

import Cubismo        from '../core/Cubismo'
import Application    from './application/Application'
import Cube           from './Cube'
import MetaDataObject from './MetaDataObject'
import { MetaDataClassDefinition } from './MetaData'

export default class MetaDataClass {

  #cubismo     : Cubismo
  #application : Application
  #cube        : Cube
  #name        : string
  #type        : MetaDataClassDefinition
  #dirname     : string
  #filename    : string
  #elements    : Map<string, [MetaDataObject, string]>
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
    
    this.#cubismo     = cubismo
    this.#application = application
    this.#cube        = cube
    this.#name        = name
    this.#type        = type
    this.#dirname     = dirname
    this.#filename    = filename
    this.#elements    = new Map()
    this.#cache       = new Map()
  }

  get application(): Application {
    return this.#application
  }

  get cube(): Cube {
    return this.#cube;
  }

  get type(): string {
    return this.#type.type
  }

  get name(): string {
    return this.#name
  }

  add<T extends MetaDataObject> (element: T, moduleFileName: string) {

    if(this.#elements.has(element.name)) {
      throw new Error(`${this.type} '${this.name}' already has ${element.type} '${element.name}'`)
    }

    this.#elements.set(element.name, [element, moduleFileName])

    Object.defineProperty(this, element.name, {
      enumerable: true,
      get() {
        console.log(`123`)
        const value = this.#elements.get(element.name)
        loadModule(value[1], element.type(), element.name, this, element, this.#cache)
        return value[0]
      }
    })

    const loadModule = function <T extends MetaDataObject>(
        fileName   : string, elementType: string, 
        elementName: string, self       : MetaDataClass,
        context    : MetaDataObject,
        cache      : Map<string, [number, any]>
      ): any {

      if (!fs.existsSync(fileName)) {
          throw new Error(`Can't find module file '${fileName}' for ${elementType} '${elementName}'`)
      }
        
      let cachedModule
      if(cache.has(fileName)) {
        cachedModule = cache.get(fileName)
        let lastUpdated = fs.statSync(fileName).mtime.getTime()
        if (lastUpdated === cachedModule[0]) {
          return cachedModule[1]
        } else {
          const loaded = demand(fileName, context, { 
              Application: self.application,
              Cube       : self.cube,
              Manager    : context
            },
            { hideGlobals: ['all'] })
          cache.set(fileName, [lastUpdated, loaded])
          return loaded
        }
      }
    }
  }
}