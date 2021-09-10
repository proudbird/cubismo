import EventEmitter from 'events'
import { Model } from 'sequelize'

import MetaDataObject from '../classes/MetaDataObject'
import View from '../ui/View'
import Collection from '../classes/Collection'
import CollectionItem from './CollectionItem'

const records = new WeakMap()

declare type ColletionStore = {
  [key: string]: Collection
}

export default class CatalogInstance{

  #model   : any
  #mdObject: MetaDataObject 
  #record  : any
  #name    : string
  #code    : string
  #parent  : CatalogInstance
  #owner   : CatalogInstance
  #isFolder: boolean
  record: any

  #collectionStore: ColletionStore

  constructor(model: any, record: any) {

    this.#model  = model
    this.#record = record

    this.#collectionStore = {}

    for(let property in this.#model.definition['attributes']) {
      Object.defineProperty(this, property, {
        enumerable: true,
        get() {
          return this.getValue(property)
        },
        set(value) {
          this.setValue(property, value)
        }
      })
    }

    const self = this

    async function getCollection(model: any, record: any, property: string, colletionStore: ColletionStore) {

      let collection: Collection

      collection = colletionStore[property];
      // if catalog item has he collection in the store, so just reurn it
      if(!collection) {
        if(record.isNewRecord) { // no need to find collection items in tha DB
          collection = new Collection(self, model.associations[property].target, []);
        } else {
          const items = await record[`get${property}`]();
          collection = new Collection(self, model.associations[property].target, items);
        }
  
        colletionStore[property] = collection;
      }

      return collection;
    }

    for (let collectionId in this.#model.definition.collections) {
    const collectionDefinition = this.#model.definition.collections[collectionId]
    Object.defineProperty(this, collectionDefinition.name, {
      enumerable: true,
      get: function () {
          return getCollection(this.#model, this.#record, collectionDefinition.name, this.#collectionStore)
        }
      })
    } 
  }

  get id(): string {
    return this.#record.getDataValue('id')
  }

  get Code(): string {
    return this.#record.getDataValue('Code')
  }

  set Code(value: string) {
    this.setValue('Code', value)
  }

  get Name(): string {
    return this.getValue('Name')
  }

  set Name(value: string) {
    this.setValue('Name', value)
  }

  get Parent(): string {
    return this.#record.getDataValue('Parent')
  }

  get Owner(): any {
    return this.#record.getDataValue('Owner')
  }

  set Owner(value: any) {
    this.setValue('Owner', value)
  }

  getValue(property: string, lang?: string): any {

    async function getAssociation(record: any, property: string, fieldId: string) {
      return record[`get${property}`]()
    }

    lang = lang || this.#model.application.lang
    const definition = this.#model.definition

    let value: any
    let element: any
    let fieldId = property
    if (property === 'Name') {
        if (definition.nameLang && definition.nameLang.length) {
            fieldId = fieldId + '_' + lang
        }
    } else if (property === 'id') {
        return this.id
    } else if (property === 'Code') {
        return this.Code
    } else if (property === 'Parent') {
        return this.Parent
    } else if (property === 'Owner') {
        return this.Owner
    } else {
        element = definition.attributes[property]
        if(element) {
          if(element.type.dataType === 'ENUM') {
            const modelId = element.type.reference.modelId;
            const valueId = this.#record.getDataValue(element.fieldId);
            const application = this.#model.application;
            const store = this.#model.cubismo.enums.get(application);
            const enumValue = store[modelId][valueId];

            return enumValue;
          }
          if (element.type.lang && element.type.lang.length) {
              fieldId = element.fieldId + '_' + lang;
          } else if (element.type.dataType === 'FK') {
            return getAssociation(this.#record, property, element.fieldId)
          } else {
              fieldId = element.fieldId
          }
        }
    }
    value = this.#record.getDataValue(fieldId);
    if(typeof value == "boolean") {
      return value;
    } else {
      return value || '';
    }
    
}

  setValue(property: string, newValue: any, lang?: string) {
    
    function _setValue(model: any, record: any, fieldId: string, newValue: any) {
        
      let value = newValue
      const itWasChangerdOnClient = !Utils.isNaN(value) && !Utils.isNil(value) ? value.itWasChangerdOnClient : false
      if (itWasChangerdOnClient) {
        value = newValue.value
        if (typeof value === 'object' && value) {
            //record[fieldId] = value
            record[record.model.associations[fieldId].foreignKey] = value.getValue('id')
        } else {
          record.setDataValue(fieldId, value)
        }
      } else {
        if ((typeof value === 'object' && value) && !(value instanceof Date)) {
          //record[fieldId] = value
          record[model.associations[fieldId].foreignKey] = value.getValue('id')
        } else {
          record.setDataValue(fieldId, value)
        }
      }
    }

    lang = lang || this.#model.application.lang
    const definition = this.#model.definition
    let fieldId = property
    if (property === 'Name') {
        if (definition.nameLang && definition.nameLang.length) {
            fieldId = fieldId + '_' + lang
        }
        newValue = newValue ? String(newValue).substr(0, definition.nameLenght) : newValue
    } else if (property === 'id') {
        throw new Error(`It is not allowed to change 'id' of an item`)
    } else if (property === 'Code') {
        fieldId = 'Code'
        if(definition.codeType === 'STRING') {
          newValue = newValue ? String(newValue).substr(0, definition.codeLenght) : newValue
        }
    } else if (property === 'Parent') {
        this.#record.Parent = newValue.value || newValue
        if (newValue) {
            _setValue(this.#model, this.#record, 'Parent', newValue)
        } else {
            _setValue(this.#model, this.#record, 'Parent', null)
        }
        return this
    } else if (property === 'Owner') {
      this.#record.Owner = newValue.value || newValue
        if (newValue) {
            _setValue(this.#model, this.#record, 'Owner', newValue)
        } else {
            _setValue(this.#model, this.#record, 'Owner', null)
        }
        return this
    } else {
      const element = definition.attributes[property]

      fieldId = element.fieldId

      if(element.type.dataType === 'ENUM') {
        newValue = newValue.id;
      }

      if (element.type.lang && element.type.lang.length) {
          fieldId = element.fieldId + '_' + lang
      }

      if(element.type.dataType === 'STRING') {
        newValue = newValue ? String(newValue).substr(0, element.type.length) : newValue
      }

      if (element.type.dataType === 'FK') {
          fieldId = this.#model.associations[property].identifier
          if (newValue) {
              _setValue(this.#model, this.#record, property, newValue)
          } else {
              _setValue(this.#model, this.#record, property, null)
          }
          return this
      }
    }
    _setValue(this.#model, this.#record, fieldId, newValue)

    return this
}

  async save() {
    try {
      await this.#record.save()
      saveAssociations(this, this.#model, this.#record)
      //*await this.record.save()
      return Promise.resolve(this)
    } catch (err) {
      Promise.reject(`Unsuccessful attempt to save item to database: ${err}`)
    }
    
  }

  async show() {
    const view = new View(
          this.#model.cubismo, 
          this.#model.application, 
          this.#model.cube,
          this.#model.class,
          this.#model.modelName,
          this.#model.definition,
          'Instance', 
          {}, 
          { instance: this }
    )

    view.show()
  }

  toString() {
    return this.Name
  }
}

async function saveAssociations(owner, ownerModel, record) {

  if(ownerModel.collections && ownerModel.collections.length) {
    for(let model of ownerModel.collections) {
      // await model.destroy({
      //   where: {
      //       ['ownerId']: owner.id
      //   }
      // })
      const collectionItems = await owner[model.modelName];
      for(let item of collectionItems) {
        await item.save()
      }
    }
  }
}