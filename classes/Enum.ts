import { EnumStore } from '../core/types'
import Cubismo        from '../core/Cubismo'
import Application    from './application/Application'
import Cube           from './Cube'
import { MetaDataObjectDefinition } from './MetaData'

const store: WeakMap<Application, EnumStore> = new WeakMap();
const valueStore: Map<string, { [id: string]: EnumValue }> = new Map();

export class EnumValue {

  #id   : string;
  #name : string;
  #title: string;
  #modelName: string;

  constructor(
    id   : string,
    name : string,
    title: string,
    modelName: string
  ) {
    
    this.#id    = id;
    this.#name  = name;
    this.#title = title;
    this.#modelName = modelName;
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

  get type(): string {
    return this.#modelName;
  }

  toString(): string {
    return this.#title;
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
      const modelName = `${cube.name}.${type.type}.${name}`
      const enumValue = new EnumValue(value.id, value.name, value.title, modelName);
      Object.defineProperty(this, value.name, {
        value     : enumValue,
        writable  : false,
        enumerable: true
      });

      enumValues[value.id] = enumValue;
    })

    enumStore[this.#modelId] = enumValues;
    store.set(application, enumStore);
    valueStore.set(this.#modelId, enumValues);
  }

  get type(): string {
    return this.#type.type
  }

  get name(): string {
    return this.#name
  }

  static getValue(modelId: string, id: string): EnumValue {

    const values = valueStore.get(modelId);
    if(!values) {
      throw new Error(`Can't find Enum model with ID '${modelId}'`);
    }

    const value = values[id];
    if(!value) {
      throw new Error(`Can't find Enum value with ID '${id}'`);
    }

    return value;
  }
}