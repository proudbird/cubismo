import { DataBaseModel, SaveOptions } from '../database/types';
import Instance from './Instance';
import Collection from './Collection'

export default class RegistratorInstance extends Instance {

  #model   : any
  #record  : any
  #date    : Date
  #number  : string
  #collections: Record<string, Collection<Instance>>;
  #saveHandlers: Function[];

  constructor(model: any, record: any) {

    super(model, record);

    this.#model  = model;
    this.#record = record;

    this.#collections = {};
    this.#saveHandlers = [];

    for (let collectionId in this.#model.definition.collections) {
      const collectionDefinition = this.#model.definition.collections[collectionId];
      const collectionName = collectionDefinition.name;
      Object.defineProperty(this, collectionName, {
        enumerable: true,
        get: () => {
          let collection = this.#collections[collectionName];
          if(!collection) {
            collection = new Collection(this, this.#record, model.associations[collectionName].target, (saveHandler: Function): void => {
              this.#saveHandlers.push(saveHandler);
            });
            this.#collections[collectionName] = collection;
          }
            return collection;
          }
      });
    }
  }

  get Number(): string {
    
    try {
      return this.#record.getDataValue('Number');
    } catch (error) {
      throw new Error(`Can't get '${this.#model.name}' property 'Number': ${error}`);
    }
  }

  set Number(value: string) {

    try {
      this.#record.setDataValue('Number', value);
    } catch (error) {
      throw new Error(`Can't set '${this.#model.name}' property 'Number' with value '${value}': ${error}`);
    }
  }

  get Date(): Date {

    try {
      return this.#record.getDataValue('Date');
    } catch (error) {
      throw new Error(`Can't get '${this.#model.name}' property 'Date': ${error}`);
    }
  }

  set Date(value: Date) {

    try {
      this.#record.setDataValue('Date', value);
    } catch (error) {
      throw new Error(`Can't set '${this.#model.name}' property 'Date' with value '${value}': ${error}`);
    }
  }

  async save(saveOptions: SaveOptions): Promise<RegistratorInstance> {
    
    saveOptions = saveOptions || {};
    const extTransaction = saveOptions.transaction;
    let transaction = saveOptions.transaction;
    if(!extTransaction && this.#saveHandlers.length) {
      try {
        transaction = await this.#model.sequelize.transaction();
      } catch (error) {
        throw new Error(`Can't create transaction: ${error}`);
      }
    }

    try {
      await super.save({ transaction });
      for(let handler of this.#saveHandlers) {
        await handler({ transaction });
      }
      if(!extTransaction && transaction) {
        await transaction.commit();
      }
      return this;
    } catch (error) {
      if(!extTransaction && transaction) {
        await transaction.rollback();
      }
      throw new Error(`Unsuccessful attempt to save instance to database: ${error}`);
    }
  }
}