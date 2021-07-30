import EventEmitter from 'events'
import { Model } from 'sequelize'

import MetaDataObject from './MetaDataObject'
import View from '../ui/View'
import Collection from './Collection'
import CollectionItem from './CollectionItem'

const records = new WeakMap()

export default class DataSetRecord {

  #model   : any
  #mdObject: MetaDataObject 
  #record  : any
  #name    : string
  #code    : string
  #isFolder: boolean
  record: any

  constructor(model: any, record: any) {

    this.#model  = model
    this.#record = record

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
  }

  get id(): string {
    return this.#record.getDataValue('id')
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
    if (property === 'id') {
        return this.id
    } else {
        element = definition.attributes[property]
        if(element) {
          if (element.type.lang && element.type.lang.length) {
              fieldId = element.fieldId + '_' + lang;
          } else if (element.type.dataType === 'FK') {
            return getAssociation(this.#record, property, element.fieldId)
          } else {
              fieldId = element.fieldId
          }
        }
    }
    value = this.#record.getDataValue(fieldId) || ''
    return value
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
        if (typeof value === 'object' && value) {
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
    if (property === 'id') {
        throw new Error(`It is not allowed to change 'id' of an item`)
    } else {
      const element = definition.attributes[property]
      fieldId = element.fieldId
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
      return Promise.resolve(this)
    } catch (err) {
      Promise.reject(`Unsuccessful attempt to save record to database: ${err}`)
    }
  }
}