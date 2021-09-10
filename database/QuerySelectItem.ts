import { Sequelize } from 'sequelize';
import Application from '../classes/application/Application';

import DBDriver from './DBDriver';
import { FieldDefinition } from './queries/types';

export default class QuerySelectItem {

  constructor(record, fieldsMap: Map<string, FieldDefinition>) {

    for(let key in record) {
      const attribute = fieldsMap.get(key);
      Object.defineProperty(this, attribute.alias, {
        get() {
          if(attribute.dataType === 'FK') {
            const reference = attribute.model.findOne({ where: { id: record[key] } });
            return reference;
          } else {
            return record[key];
          }
        }
      })
    }
  }
}