import EventEmitter from 'events'
import { Model } from 'sequelize'

import MetaDataObject from './MetaDataObject'
import View from '../ui/View'
import CatalogInstance from './CatalogInstance'

const records = new WeakMap()

export default class CollectionItem {

  #model   : any
  #mdObject: MetaDataObject 
  #record  : any
  #name    : string
  #code    : string
  #owner   : CatalogInstance
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

  get Owner(): any {
    return this.#record.getDataValue('Owner')
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
    } else if (property === 'Owner') {
        return this.Owner
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
      //*await this.record.save()
      return Promise.resolve(this)
    } catch (err) {
      Promise.reject(`Unsuccessful attempt to save item to database: ${err}`)
    }
    
  }
}