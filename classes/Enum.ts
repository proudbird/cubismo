import Cube from './Cube';
import Application from './application/Application';
import { EnumStore } from '../core/types';
import { EnumModelDefinition } from '../database/types';

const store: WeakMap<Application, EnumStore> = new WeakMap();
const valueStore: Map<string, Record<string, EnumValue>> = new Map();

export class EnumValue {

  #id: string;
  #name: string;
  #title: string;
  #type: string;

  constructor(
    id: string,
    name: string,
    title: string,
    type: string
  ) {
    
    this.#id = id;
    this.#name = name;
    this.#title = title;
    this.#type = type;
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
    return this.#type;
  }

  toString(): string {
    return this.#title;
  }
}

interface EnumOptions {
  application: Application;
  cube: Cube;
  type: string;
  name: string; 
  model: EnumModelDefinition;
  values: EnumValue[];
}

export default class Enum {

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

  #cube: Cube;
  #name: string;
  #type: string;
  #model: EnumModelDefinition;

  constructor({
    application, 
    cube, 
    type,
    name, 
    model,
  }: EnumOptions) {
    
    this.#cube = cube;
    this.#name = name;
    this.#type = type;
    this.#model = model;

    const enumStore = store.get(application) || {};
    const enumValues = {};
    const valueType = `${cube.name}.${type}.${name}`;

    model.values.forEach(value => {
      const enumValue = new EnumValue(value.id, value.name, value.title, valueType);
      Object.defineProperty(this, value.name, {
        value     : enumValue,
        writable  : false,
        enumerable: true
      });

      enumValues[value.id] = enumValue;
    })

    enumStore[this.#model.id] = enumValues;
    store.set(application, enumStore);
    valueStore.set(this.#model.id, enumValues);
  }

  get cube(): Cube {
    return this.#cube;
  }
  
  get name(): string {
    return this.#name;
  }

  get type(): string {
    return this.#type;
  }
}
