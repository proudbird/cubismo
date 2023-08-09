import { dirname } from 'path';
import { MetaDataTypes, isTypeOf } from '../common/Types';
import Enum from './Enum';
import { DataBaseModel, ModelAttributeDefinition, SaveOptions, Value } from '../database/types';

export default class Instance {

  #model   : DataBaseModel
  #record  : any

  constructor(model: DataBaseModel, record: any) {

    this.#model  = model;
    this.#record = record;

    for(let property in this.#model.definition.attributes) {
      Object.defineProperty(this, property, {
        enumerable: true,
        get() {
          return this.getValue(property);
        },
        set(value) {
          this.setValue(property, value);
        }
      })
    }
  }

  _record() {

    function getRoot(path: string): string {
      return dirname(path.substring(
        path.indexOf("(") + 1, 
        path.lastIndexOf(":")
      ));
    }

    const stack = (new Error()).stack;
    const trace = stack.split('\n');
    
    if(getRoot(trace[1]) === getRoot(trace[2])) {
      return this.#record;
    } else {
      return null;
    }
  }

  get id(): string {
    try {
      return this.#record.getDataValue('id');
    } catch (error) {
      throw new Error(`Can't get '${this.#model.name}' property 'id': ${error}`);
    }
  }

  getValue<T extends Instance>(property: string, lang?: string): Value<T> | Promise<Value<T>> {
    
    if (property === 'id') {
        return this.id;
    } 

    let value  : Value<T>;
    let element: ModelAttributeDefinition;
    let fieldId: string;
    
    const definition = this.#model.definition;
    element = definition.attributes[property];
    if(!element) {
      throw new Error(`Can't find property '${property}' of ${this.#model.name}`);
    }
    
    fieldId = element.fieldId;
    if (element.type.lang && element.type.lang.length) {
      lang = lang || this.#model.application.lang;
      if(element.type.lang.includes(lang)) {
        fieldId = `${fieldId}_${lang}`;
      } else {
        fieldId = `${fieldId}_${this.#model.application.defaultLang}`;
      }
    }

    try {
      value = this.#record.getDataValue(fieldId);
    } catch (error) {
      throw new Error(`Can't get property's value '${property}' of ${this.#model.name}: ${error.message}`);
    }

    if(!value) {
      return value;
    }

    switch (element.type.dataType) {
      case 'STRING':
        return value || '';
      case 'NUMBER':
        return Number(value);
      case 'BOOLEAN':
        return Boolean(value);
      case 'DATE':
        return value || new Date(1, 1, 1, 0 , 0, 0, 0);
      case 'ENUM':
        return Enum.getValue(element.type.reference.modelId, value as string);
      case 'FK':
        // call sequelize getter for thet property
        // returns Promise!
        return this.#record[`get${property}`]();
      default:
        return value;
    } 
  }

  setValue(property: string, value: any, lang?: string): void | Promise<void> {
    
    if (property === 'id') {
        throw new Error(`You can not change 'id' of an instance`);
    } 

    let element: ModelAttributeDefinition;
    let fieldId = property;
    
    const definition = this.#model.definition;
    element = definition.attributes[property];
    if(!element) {
      throw new Error(`Can't find property '${property}' of ${this.#model.name}`);
    }
    
    fieldId = element.fieldId;
    if (element.type.lang && element.type.lang.length) {
      lang = lang || this.#model.application.lang;
      if(definition.nameLang.includes(lang)) {
        fieldId = `${fieldId}_${lang}`;
      } else {
        throw new Error(`'${this.#model.name}' property '${property}' can't have value in language '${lang}'`);
      }
    }

    switch (element.type.dataType) {
      case 'STRING':
        if(value) {
          if(value.toString) {
            value = value.toString();
          }
          if(element.type.length) {
            value = String(value).substr(0, element.type.length);
          } 
        } else {
          value = '';
        }
        break;
      case 'NUMBER':
        if(element.type.scale) {
          value = parseFloat(value);
        } else {
          value = parseInt(value);
        }
        if(isNaN(value)) {
          value = 0;
          break;
        }
        if(String(parseInt(value)).length > (element.type.length - element.type.scale)) {
          throw new TypeError(`Attempt to set Number property value with number, that exceeds maximum number length of ${element.type.dataType.length}`);
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
          if(!isTypeOf(value, MetaDataTypes.getTypeById(element.type.reference.modelId))) {
            throw new TypeError(`Attempt to set reference property value with wrong value`);
          }
          value = value.id;
        }
    }

    try {
      this.#record.setDataValue(fieldId, value);
    } catch (error) {
      throw new Error(`Can't set '${this.#model.name}' property '${property}' with value '${value}': ${error}`);
    }
  }

  async save(saveOptions: SaveOptions): Promise<Instance> {
    
    try {
      this.#record.save(saveOptions);
      return this;
    } catch (error) {
      throw new Error(`Unsuccessful attempt to save instance to database: ${error}`);
    }
  }

  async delete(): Promise<void> {
    
    try {
      this.#record.destroy();
    } catch (error) {
      throw new Error(`Unsuccessful attempt to delete instance from database: ${error}`);
    }
  }

  type(): string {
    return this.#model.name;
  }
}