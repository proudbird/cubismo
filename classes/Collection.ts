import Cubismo        from '../cubismo/Cubismo'
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

  async findOne(options: any = {}) {

    options = adoptOptions(options, this.#model)
    let result = undefined
    try {
      result = await this.#model.findOne(options)
    } catch (error) {
      Logger.error(`Unsseccesfull attempt to find object '${this}' with options ${options.toString()}`, error)
    }
    return result
  }
  
}

function adoptOptions(options: any, model: any) {

  if(options.where) {

    function getAdoptedinLang(property: string, fieldId: string, langs: [string]): string {
      
      let adopted = property
      if(langs && langs.length) {
        let found = false
        langs.forEach(lang => {
          if(property === `${fieldId}_${lang}`) {
            found = true
            return
          }
        })

        if(!found) {
          adopted = `${fieldId}_${model.application.lang}`
        }
      }

      return adopted
    }

    for(let property in options.where) {
      let adopted = property;
      let value = options.where[property];
      if(!value) {
        throw new Error(`Rigth side of 'where' option can not be empty`)
      }
      if(property.includes('Name')) {
        adopted = getAdoptedinLang(property, 'Name', model.definition.nameLang)
      } else if(property === 'Owner') {
        adopted = 'ownerId'
        const value = options.where[property]
        const id = value.id
        if(!id) {
          throw new Error(`Rigth side of 'where' option must be a MetaData object`)
        }
        options.where[property] = id
      } else {
        for(let key in model.definition.attributes) {
          if(property.includes(key)) {
            const attribute = model.definition.attributes[key]
            const fieldId = attribute.fieldId
            adopted = property.replace(key, fieldId)
            if(attribute.type.dataType === 'FK' || attribute.type.dataType === 'ENUM') {
              //const value = options.where[property]
              let newValue = [];
              if(Utils.isArray(value)) {
                for(let val of value) {
                  newValue.push(val.id)
                }
              } else {
                newValue = value.id
                if(!newValue) {
                  throw new Error(`Rigth side of 'where' option must be a MetaData object`)
                }
              }
              
              options.where[property] = newValue
            } else if(attribute.type.dataType === 'STRING') {
              adopted = getAdoptedinLang(adopted, fieldId, model.definition.attributes[key].type.lang)
            } else {
              // nothing to do
            }
            break
          }
        }
      }

      if(adopted != property) {
        options.where[adopted] = options.where[property]
        delete options.where[property]
      }
    }
    return options
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