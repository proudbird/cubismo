import MetaDataObject from './MetaDataObject'

export class MetaDataClassDefinition {
  
  #name          : string
  #objectName    : string
  #classMaker    :  IMetaDataClass
  #objectMaker?  : IMetaDataObject
  #instanceMaker?: IMetaDataInstance

  constructor(
      name          : string, 
      objectName    : string, 
      classMaker    : IMetaDataClass,
      objectMaker?  : IMetaDataObject,
      instanceMaker?: IMetaDataInstance
    ) {

    this.#name          = name
    this.#objectName    = objectName
    this.#classMaker    = classMaker
    this.#objectMaker   = objectMaker
    this.#instanceMaker = instanceMaker
  }

  get type(): string {
    return this.#name
  }

  get objectType(): string {
    return this.#objectName
  }

  get classMaker(): IMetaDataClass {
    return this.#classMaker
  }

  get objectMaker(): IMetaDataObject {
    return this.#objectMaker
  }

  get instanceMaker(): IMetaDataInstance {
    return this.#instanceMaker
  }
}

export type MetaDataClassDefinitions = Map<string, MetaDataClassDefinition>

export class MetaDataObjectDefinition {
  
  #name       : string
  #objectName: string
  #maker      : MetaDataObject

  constructor(
      name       : string, 
      objectName: string, 
      maker      : MetaDataObject
    ) {

    this.#name        = name
    this.#objectName = objectName
    this.#maker       = maker
  }

  get type(): string {
    return this.#name
  }

  get objectType(): string {
    return this.#objectName
  }

  get maker(): MetaDataObject {
    return this.#maker
  }
}