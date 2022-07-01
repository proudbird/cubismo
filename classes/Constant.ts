import Cubismo        from '../core/Cubismo'
import Application    from './application/Application'
import Cube           from './Cube'
import MetaDataObject from './MetaDataObject'
import { MetaDataObjectDefinition } from './MetaData'
import { Model } from 'sequelize/types'
import MetaDataInstance from './MetaDataInstance'
import { DataBaseModel, ModelAttributeDefinition, Value } from '../database/types';
import Enum from './Enum';
import { MetaDataTypes, isTypeOf } from '../common/Types';
import ConstantValue from './ConstantValue'
import Instance from './Instance'

export default class Constant {

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
    model        : DataBaseModel,
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

    this.#model  = model;
  }

  get name(): string {
    return this.#name
  }

  async getValue<T extends Instance>(lang?: string): Promise<Value<T>> {

    let value  : Value<T>;
    let fieldId: string = `_value`;
    
    const definition = this.#model.definition as any as ModelAttributeDefinition;
    
    if (definition.type.lang && definition.type.lang.length) {
      lang = lang || this.#model.application.lang;
      if(definition.type.lang.includes(lang)) {
        fieldId = `${fieldId}_${lang}`;
      } else {
        fieldId = `${fieldId}_${this.#model.application.defaultLang}`;
      }
    }

    let record: any;
    try {
      const model = this.#model;
      record = await model.findOne();
      if(!record) {
        record = model.build();
        await record.save();
      }
      value = record.getDataValue(fieldId);
    } catch (error) {
      throw new Error(`Can't get constant's value of ${this.#model.name}: ${error.message}`);
    }

    switch (definition.type.dataType) {
      case 'STRING':
        value =  value || '';
        break;
      case 'NUMBER':
        value =   Number(value);
        break;
      case 'BOOLEAN':
        value =   Boolean(value);
        break;
      case 'DATE':
        value =   value || new Date(1, 1, 1, 0 , 0, 0, 0);
        break;
      case 'ENUM':
        value =   Enum.getValue(definition.type.reference.modelId, value as string);
        break;
      case 'FK':
        // call sequelize getter for thet property
        // returns Promise!
        value =  record[`getValue`]();
        break;
    } 

    return value;
  }

  async setValue<T extends Instance>(value: Value<T>, lang?: string): Promise<void> {

    let fieldId = `_value`;
    
    const definition = this.#model.definition as any as ModelAttributeDefinition;
    
    if (definition.type.lang && definition.type.lang.length) {
      lang = lang || this.#model.application.lang;
      if(definition.type.lang.includes(lang)) {
        fieldId = `${fieldId}_${lang}`;
      } else {
        throw new Error(`'${this.#model.name}' value can't have value in language '${lang}'`);
      }
    }

    switch (definition.type.dataType) {
      case 'STRING':
        value = value ? String(value).substr(0, definition.type.length) : '';
        break;
      case 'NUMBER':
        if(definition.type.scale) {
          value = parseFloat(value as string);
        } else {
          value = parseInt(value as string);
        }
        if(isNaN(value)) {
          value = 0;
          break;
        }
        if(String(parseInt(value as unknown as string)).length > (definition.type.length - definition.type.scale)) {
          throw new TypeError(`Attempt to set Number property value with number, that exceeds maximum number length of ${definition.type.dataType.length}`);
        }
        break;
      case 'BOOLEAN':
        value = Boolean(value);
        break;
      case 'DATE':
        value = value || new Date(0, 0, 1, 0, 0, 0, 0);
        break;
      default:
        if(!(value === undefined || value === null)) {
          if(!isTypeOf(value, MetaDataTypes.getTypeById(definition.type.reference.modelId))) {
            throw new TypeError(`Attempt to set reference property value with wrong value`);
          }
          value = (value as unknown as T).id;
        }
    }

    let record: any;
    try {
      record = await this.#model.findOne();
      if(!record) {
        record = this.#model.build();
      }
      record.setDataValue(fieldId, value);
    } catch (error) {
      throw new Error(`Can't set '${this.#model.name}' value with value '${value}': ${error}`);
    }

    try {
      await record.save();
    } catch (error) {
      throw new Error(`Unsuccessful attempt to save constant to database: ${error}`);
    }
  }

  type(): string {
    return this.#model.name;
  }
}