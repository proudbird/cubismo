import addElement from './addElement'

import Cubismo       from '../cubismo'
import Application   from './Application/Application'
import Cube          from './Cube'

export default class Cubes{

  #cubismo     : Cubismo
  #application : Application
  #elements    : Map<string, [Cube, string]>
  #cache       : Map<string, [number, any]>

  constructor(
        cubismo    : Cubismo,
        application: Application
    ) {
    
    this.#cubismo     = cubismo
    this.#application = application
    this.#elements    = new Map()
    this.#cache       = new Map();
  }

  [Symbol.iterator]() {
    const self = this;
    const entries = this.#elements.entries();
    const size = this.#elements.size;
    let count  = 1;
    let done   = false;
    let value: any;
    return {
      next: function() {
        const next =  entries.next();
        done = next.done;
        if(!done) {
          value = self[next.value[0]];
        }
        return { value, done }
      }
    }
  }

  addCube(element: ICube, fileName: string): ICube {
    return addElement(element, this, this.#application, this.#elements, this.#cache, fileName)
  } 
}