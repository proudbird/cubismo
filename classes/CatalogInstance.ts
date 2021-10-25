import { DataBaseModel, SaveOptions } from '../database/types';
import Instance from './Instance';
import Collection from './Collection';
import { InstanceCollections } from './Collections';

export default class CatalogInstance extends Instance {

  #model   : DataBaseModel;
  #record  : any;
  #name    : string;
  #code    : string;
  #parent  : CatalogInstance;
  #owner   : CatalogInstance;
  #isFolder: boolean;
  #collections: InstanceCollections;
  #saveHandlers: Function[];

  constructor(model: DataBaseModel, record: any) {

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

  get Code(): string {

    try {
      return this.#record.getDataValue('Code');
    } catch (error) {
      throw new Error(`Can't get '${this.#model.name}' property 'Code': ${error}`);
    }
  }

  set Code(value: string) {
    this.#record.setDataValue('Code', value);
  }

  get Name(): string {

    let fieldId = 'Name';
    const definition = this.#model.definition;
    if (definition.nameLang && definition.nameLang.length) {
      const lang = this.#model.application.lang;
      if(definition.nameLang.includes(lang)) {
        fieldId = `${fieldId}_${lang}`;
      } else {
        fieldId = `${fieldId}_${this.#model.application.defaultLang}`;
      }
    }

    try {
      return this.#record.getDataValue(fieldId);
    } catch (error) {
      throw new Error(`Can't get '${this.#model.name}' property 'Name': ${error}`);
    }
  }

  set Name(value: string) {

    let fieldId = 'Name';
    const definition = this.#model.definition;
    if (definition.nameLang && definition.nameLang.length) {
      const lang = this.#model.application.lang;
      if(definition.nameLang.includes(lang)) {
        fieldId = `${fieldId}_${lang}`;
      } else {
        throw new Error(`'${this.#model.name}' property 'Name' can't have value in language '${lang}'`);
      }
    }

    try {
      this.#record.setDataValue(fieldId, value);
    } catch (error) {
      throw new Error(`Can't set '${this.#model.name}' property 'Name' with value '${value}': ${error}`);
    }
  }

  // @ts-ignore
  get Parent(): Promise<CatalogInstance> {
    return this.getValue('Parent') as Promise<CatalogInstance>;
  }

  set Parent(value: CatalogInstance) {
    this.setValue('Parent', value);
  }

  // @ts-ignore
  get Owner(): Promise<CatalogInstance> {
    return this.getValue('Owner') as Promise<CatalogInstance>;
  }

  set Owner(value: CatalogInstance) {
    this.setValue('Owner', value);
  }
  
  toString(): string {
    return this.Name;
  }

  async save(saveOptions: SaveOptions): Promise<CatalogInstance> {
    
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
    } finally {
      //throw new Error(`here`);
    }
  }
}