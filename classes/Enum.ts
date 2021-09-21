import { EnumStore } from '../cubismo/types'
import Cubismo        from '../cubismo/Cubismo'
import Application    from './Application/Application'
import Cube           from './Cube'
import { MetaDataObjectDefinition } from './MetaData'

const store: WeakMap<Application, EnumStore> = new WeakMap();

class EnumValue {
  #id   : string
  #name : string
  #title: string

  constructor(
    id   : string,
    name : string,
    title: string,
  ) {
    
    this.#id    = id
    this.#name  = name
    this.#title = title
  }

  get id(): string {
    return this.#id
  }

  get name(): string {
    return this.#name
  }

  get title(): string {
    return this.#title
  }
}

export default class Enum {

  #cubismo      : Cubismo
  #application  : Application
  #cube         : Cube
  #name         : string
  #type         : MetaDataObjectDefinition
  #dirname      : string
  #filename     : string
  #modelId      : string
  #values       : Map<string, EnumValue>

  constructor(
    cubismo      : Cubismo,
    application  : Application, 
    cube         : Cube, 
    type         : MetaDataObjectDefinition,
    name         : string, 
    modelId      : string,
    values       : [EnumValue]
  ) {
    
    this.#cubismo       = cubismo
    this.#application   = application
    this.#cube          = cube
    this.#name          = name
    this.#type          = type
    this.#modelId       = modelId

    const enumStore = store.get(application) || {};
    const enumValues = {};

    values.forEach(value => {
      const enumValue = new EnumValue(value.id, value.name, value.title);
      Object.defineProperty(this, value.name, {
        value     : enumValue,
        writable  : false,
        enumerable: true
      });

      enumValues[value.id] = enumValue;
    })

    enumStore[this.#modelId] = enumValues;
    store.set(application, enumStore);
  }

  get type(): string {
    return this.#type.type
  }

  get name(): string {
    return this.#name
  }
}