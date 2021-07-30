import { Sequelize } from 'sequelize';
import Application from '../classes/application/Application';

import DBDriver from './DBDriver';

export default class QuerySelectItem {

  #driver: Sequelize;
  #application: Application;

  constructor(record, fieldsMap, driver) {

    this.#driver = driver;

    for(let key in record) {
      const attribute = fieldsMap.get(key);
      Object.defineProperty(this, attribute.alias, {
        get() {
          if(attribute.type.dataType === 'FK') {
            const model = driver.models[attribute.type.reference.modelId];
            return model.findOne({ where: { id: record[key] } });
          } else {
            return record[key];
          }
        }
      })
    }
  }
}

async function getAssociation(driver: any, attribute: any, value: any) {
  const model = driver.models[attribute.type.reference.modelId];
  const reference = await model.findOne({ where: { id: value } });
  return reference;
}