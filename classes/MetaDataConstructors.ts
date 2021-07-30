import Cube        from './Cube'
import Catalogs    from './Catalogs'

type MetaDataTypeDefinition = {
  
}

export default class MetaDataConstructors {

  #constructors: Map<string, any>

  constructor() {
    this.#constructors = new Map()  
  }

  add(name: string, constructor: any): void {
    this.#constructors.set(name, constructor)
  }
}