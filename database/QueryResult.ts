import Iterable from '../core/Iterable';
import { DataSourceAtrribute, FieldDefinition } from './queries/types';
import QueryResultEntry from './QueryResultEntry';

export default class QueryResul {

  #fieldsMap: Map<string, FieldDefinition>;
  #entries: any[];

  constructor(fieldsMap: Map<string, FieldDefinition>, entries: any[]) {
    this.#fieldsMap = fieldsMap;
    this.#entries = entries;
  }

  [Symbol.iterator] = () => {
    let count = 0;
    let done = false;

    let next = () => {
       if(count >= this.#entries.length) {
          done = true;
       }
       return { done, value: new QueryResultEntry(this.#entries[count++], this.#fieldsMap) };
    }

    return { next };
  }

  toJSON(): string {
    let result = '';

    const fields: DataSourceAtrribute[] = [];
    const attributes: { [name: string]: DataSourceAtrribute } = {};
    let index = 0;
    for(let [key, value] of this.#fieldsMap) {
      attributes[value.alias] = {
        index,
        name: value.alias,
        title: value.alias, // TODO: get title from model defineInsertions
        type: { 
          dataType: value.dataType, 
          length: value.length,
          scale: value.scale,
          reference: value.model.definition.id
        }         
      }
      fields.push(attributes[value.alias]);
      index++;
    }
    
    let entries = [];
    for(let entry of this.#entries) {
      const values = [];
      for(let field of fields) {
        const fieldDefinition = this.#fieldsMap.get(field.name.toLowerCase());
        let value = entry[field.name.toLowerCase()];
        if(field.type.dataType === 'FK') {
          value = [value, fieldDefinition.model.definition.id];
        }
        values.push(value);
      }
      entries.push(values);
    }

    const data = {
      attributes,
      entries
    }
    
    result = JSON.stringify(data);
    return result;
  }
}