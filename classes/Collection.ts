import Cubismo        from '../cubismo'
import Application    from './Application/Application'
import Cube           from './Cube'
import CollectionItem from './CollectionItem'
import { MetaDataObjectDefinition } from './MetaData'
import { Model } from 'sequelize/types'
import MetaDataInstance from './MetaDataInstance'
import CatalogInstance from './CatalogInstance'

const recordsMap = new WeakMap()

export default class Collection {

  #model: any;
  #items: CollectionItem[];
  #owner: CatalogInstance;

  constructor(owner: CatalogInstance, model: any, items : [CollectionItem] | []) {

    this.#owner = owner;
    this.#model = model;
    this.#items = items || [] 

    this[Symbol.iterator] = function() {

      let count = 0;
      let isDone = false;
 
      let next = () => {
         if(count >= this.#items.length) {
            isDone = true;
         }
         return { done: isDone, value: this.#items[count++] };
      }
 
      return { next };
    };
  }

  add(): CollectionItem {

    const order = this.#items.length + 1
    const newItem = this.#model.build({ order, ownerId: this.#owner.id}) 
    this.#items.push(newItem)
    return newItem
  }

  forEach(callback: Function) {
    this.#items.forEach(element => {
      callback(element)
    });
  }

  
}

// import { stringify } from 'querystring'
// import Base from './Base'

// export default class Collection extends Base {

//   #elements : AppElementCollection

//   constructor(application: Application, cube: MetaDataItem, type: AppMemberType,
//     name: string, dirname: string, filename: string) {
    
//     super(application, cube, type, name, dirname, filename)
//   }

//   get elements(): AppElementCollection {

//     return this.#elements
//   }

//   add<T extends Base> (element: T) {

//     if(this.#elements.has(element.name)) {
//       throw new Error(`${this.type} '${this.name}' already has ${element.type} '${element.name}'`)
//     }

//     this.#elements.set(element.name, element)

//     Object.defineProperty(this, element.name, {
//       enumerable: true,
//       writable: false,
//       get() {
//         return this.#elements.get(element.name)
//       }
//     })
//   }
// }