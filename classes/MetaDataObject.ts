import { Model } from 'sequelize'

import Cubismo     from '../cubismo'
import Application from './Application/Application'
import Cube        from './Cube'
import { MetaDataObjectDefinition } from './MetaData'
import MetaDataInstance from './MetaDataInstance'

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

    model.build = function (values, options) {

      if (Array.isArray(values)) {
        return model.bulkBuild(values, options)
      }
      
      if(values && values['dataValues']) {
        return values
      } else {
        const record = new model(values, options);
        record.collections = model.collections;
        const self =  new maker(model, record);
        recordsMap.set(self, record);
        return self;
      }      
    }

    model.beforeBulkCreate((records, options) => {

      for(let i=0; i<records.length; i++) {
        if(records[i]['dataValues']) {
          records[i] = recordsMap.get(records[i])
        }
      }
      return records
    })

    model.afterFind((records, options) => {

      // for(let i=0; i<records.length; i++) {
      //   if(records[i]['dataValues']) {
      //     records[i] = recordsMap.get(records[i])
      //   }
      // }
      return records
    })
  }

  get type(): string {
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