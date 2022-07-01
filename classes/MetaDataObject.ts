import { existsSync } from 'fs'

import Cubismo     from '../core/Cubismo'
import Application from './application/Application'
import Cube        from './Cube'
import { MetaDataObjectDefinition } from './MetaData'
import MetaDataInstance from './MetaDataInstance'
import Logger from '../common/Logger';
import Utils from '../common/Utils';

import loadModule from "./loadModule";

const recordsMap = new WeakMap()

export default class MetaDataObject {
  
  #cubismo      : Cubismo
  #application  : Application
  #cube         : Cube
  #name         : string
  #type         : MetaDataObjectDefinition
  #dirname      : string
  #filename     : string
  #model        : any
  #instanceMaker: MetaDataInstance
  
  constructor(
        cubismo      : Cubismo,
        application  : Application, 
        cube         : Cube, 
        type         : MetaDataObjectDefinition,
        name         : string, 
        dirname      : string, 
        filename     : string,
        model        : any,
        instanceMaker: MetaDataInstance
    ) {
   
    this.#cubismo       = cubismo
    this.#application   = application
    this.#cube          = cube
    this.#name          = name
    this.#type          = type
    this.#dirname       = dirname
    this.#filename      = filename
    this.#model         = model
    this.#instanceMaker = instanceMaker

    const maker = this.#instanceMaker as any

    model.build = (values, options) => {

      if (Array.isArray(values)) {
        values = adoptValues(values, model);
        return model.bulkBuild(values, options)
      }
      
      if(values && values['_record']) {
        return values
      } else {
        values = adoptValues(values, model);
        const record = new model(values, options);
        record.collections = model.collections;
        const instanse = new maker(model, record);
        const clas = this.#type;
        if (existsSync(this.#filename)) {
             loadModule(
              this.#filename,
              this.#type.type,
               this.#name,
               instanse,
               application,
               instanse,
               undefined,
               cubismo);
           }
        return instanse;
      }      
    }

    model.beforeBulkCreate((items, options) => {

      for(let i=0; i < items.length; i++) {
        const record = items[i]._record();
        items[i] = record;
      }
    });

    model.afterFind((records, options) => {

      // for(let i=0; i<records.length; i++) {
      //   if(records[i]['dataValues']) {
      //     records[i] = recordsMap.get(records[i])
      //   }
      // }
      return records
    })
  }

  type(): string {
    return this.#type.type
  }

  get name(): string {
    return this.#name
  }

  toString(): string {
    return this.#name
  }

  new(predefinedValues?: any): MetaDataInstance {
    //const maker = this.#instanceMaker as any
    //return new maker(this.#model, predefinedValues)
    return this.#model.build(predefinedValues)
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

  async findAll(options: any = {}) {

    options = adoptOptions(options, this.#model)
    let result = undefined
    try {
      result = await this.#model.findAll(options)
    } catch (error) {
      Logger.error(`Unsseccesfull attempt to find objects '${this}' with options ${options.toString()}`, error)
    }
    return result
  }

  async findAndCountAll() {
    return await this.#model.findAndCountAll()
  }
}

function adoptOptions(options: any, model: any) {

  if(options.where) {

    for(let property in options.where) {
      let adopted = property;
      let value = options.where[property];
      if(!value) {
        throw new Error(`Rigth side of 'where' option can not be empty`)
      }
      if(property.includes('Name')) {
        adopted = getAdoptedinLang(property, 'Name', model.definition.nameLang, model.application.lang)
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
              adopted = getAdoptedinLang(adopted, fieldId, model.definition.attributes[key].type.lang, model.application.lang)
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

function adoptValues(values, model) {

  //TODO: if values ia an array so we need adopt an array
  const adoptedValues = {};

  for(let property in values) {
    let adoptedAttribute = property;
    let adoptedValue     = values[property];

    if(property === 'Name') {
      adoptedAttribute = getAdoptedinLang(property, 'Name', model.definition.nameLang, model.application.lang);
    } else if(property === 'Owner') {
      adoptedAttribute = 'ownerId';
      adoptedValue = adoptedValue ? adoptedValue.id : null;
    } else if(property === 'Parent') {
      adoptedValues['level'] =  adoptedValue.getLevel() + 1;
      adoptedAttribute = 'parentId';
      adoptedValue = adoptedValue ? adoptedValue.id : null;
    }

    const attribute = model.definition.attributes[property];
    if(attribute) {
      const fieldId = attribute.fieldId;
      adoptedAttribute = fieldId;
      if(attribute.type.dataType === 'FK' || attribute.type.dataType === 'ENUM') {
        adoptedValue = adoptedValue ? adoptedValue.id : null;
      } else if(attribute.type.dataType === 'STRING') {
        adoptedAttribute = getAdoptedinLang(adoptedAttribute, fieldId, attribute.type.lang, model.application.lang);
      }
    }

    adoptedValues[adoptedAttribute] = adoptedValue;
  }

  return adoptedValues;
}

function getAdoptedinLang(property: string, fieldId: string, langs: [string], currentLang: string): string {
      
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
      if(langs.includes(currentLang)) {
        adopted = `${fieldId}_${currentLang}`
      } else {
        adopted = `${fieldId}_${langs[0]}`
      }
    }
  }

  return adopted
}