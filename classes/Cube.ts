import i18next from 'i18next';
import MetaDataModule from './MetaDataModule';

export default class Cube extends MetaDataModule {

  #elements: Map<string, MetaDataModule> = new Map();

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
      throw new Error(`Application '${this.application.id}'; Cube '${this.cube.name}': ${Object.getPrototypeOf(this).constructor.name} already has ${type} '${name}'`)
    }
  
    this.#elements.set(name, element);
  
    Object.defineProperty(this, Object.getPrototypeOf(element).constructor.name, {
      value: element,
      enumerable: true,
      writable: false,
      configurable: true,
    })
  
    return element;
  }

  remove(name: string) {
    if(!this.#elements.has(name)) {
      throw new Error(`Application '${this.application.id}'; Cube '${this.cube.name}': ${Object.getPrototypeOf(this).constructor.name} doesn't has ${name}`)
    }
  
    this.#elements.delete(name);
  
    delete this[name];
  }

  load(): void {
    super.load();

    for(let [_, module] of this.#elements) {
      module && module.load && module.load();
    }
  }

  t(key: string) {
    return i18next.t(key, { ns: this.name });
  }
}