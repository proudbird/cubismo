import Application  from './application/Application';
import Cube   from './Cube';

import MetaDataModule from './MetaDataModule';

export interface MetaDataCollectionOptions {
  application?: Application;
  cube?: Cube;
}

export default class MetaDataCollection {

  #application: Application;
  #cube: Cube;
  #elements: Map<string, MetaDataModule>;

  constructor({ application, cube }: MetaDataCollectionOptions) {

    this.#application = application;
    this.#cube = cube;
    this.#elements = new Map();
  }

  [Symbol.iterator]() {
    const entries = this.#elements.entries();
    let done   = false;
    let value: any;

    return {
      next: function() {
        const next =  entries.next();
        done = next.done;

        if(!done) {
          value = next.value[1];
        }

        return { value, done }
      }
    }
  }

  add({ name, type, element }) {
    if(this.#elements.has(name)) {
      throw new Error(`Application '${this.#application.id}'; Cube '${this.#cube.name}': ${Object.getPrototypeOf(this).constructor.name} already has ${type} '${name}'`)
    }
  
    this.#elements.set(name, element);
  
    Object.defineProperty(this, element.name, {
      value: element,
      enumerable: true,
      writable: false,
      configurable: process.env.NODE_ENV === 'development',
    })
  
    return element;
  }

  remove(name: string) {
    if(!this.#elements.has(name)) {
      throw new Error(`Application '${this.#application.id}'; Cube '${this.#cube.name}': ${Object.getPrototypeOf(this).constructor.name} doesn't has ${name}`)
    }
  
    this.#elements.delete(name);
  
    delete this[name];
  }

  load(): void {
    for(let [_, module] of this.#elements) {
      module && module.load && module.load();
    }
  }
}
