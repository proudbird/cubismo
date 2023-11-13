import Iterable from '../core/Iterable';
import { DataSourceAttribute, FieldDefinition } from './queries/types';
import QueryResultEntry from './QueryResultEntry';

export default class QueryResult {

  #fieldsMap: Map<string, FieldDefinition>;
  #entries: any[];

  constructor(fieldsMap: Map<string, FieldDefinition>, entries: any[]) {
    this.#fieldsMap = fieldsMap;
    this.#entries = entries;
  }

  get length(): number {
    return this.#entries.length;
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

  toJSON(): any {
    let result = '';

    const fields: DataSourceAttribute[] = [];
    const attributes: { [name: string]: DataSourceAttribute } = {};
    let index = 0;
    for(let [key, value] of this.#fieldsMap) {
      if(key.includes('_p')) continue;
      
      attributes[value.alias] = {
        index,
        name: value.alias,
        title: value.alias, // TODO: get title from model defineInsertions
        type: { 
          dataType: value.dataType, 
          length: value.length,
          scale: value.scale,
          cube: value.model.definition.cube,
          className: value.model.definition.class,
          model: value.model.definition.name,
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
          value = [value, entry[field.name.toLowerCase() + '_p'], fieldDefinition.model.definition.id];
        }
        values.push(value);
      }
      entries.push(values);
    }

    const data = {
      attributes,
      entries
    }
    
    return data;
  }
}