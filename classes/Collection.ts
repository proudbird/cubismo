import Instance from './Instance';
import CollectionItem from './CollectionItem';
import { DataBaseModel, SaveOptions, Value } from '../database/types';

class CollectionItems<T extends Instance> {

  #model: DataBaseModel;
  #owner: T;
  #items: CollectionItem[];
  #revoveAllCallback: Function;

  constructor(
    model: DataBaseModel, 
    owner: T, 
    items: CollectionItem[], 
    callback: Function, 
    revoveAllCallback: Function) {

    this.#model = model;
    this.#owner = owner;
    this.#items = items; 
    this.#revoveAllCallback = revoveAllCallback;

    const handler = (options: SaveOptions): CollectionItem => {
      
      // @ts-ignore
      return this.#model.bulkCreate(this.#items, { transaction: options.transaction })
    } 

    callback(handler);
  }

  [Symbol.iterator] = function() {

    let count = 0;
    let isDone = false;

    let next = () => {
       if(count >= this.#items.length) {
          isDone = true;
       }
       return { done: isDone, value: this.#items[count++] };
    }

    return { next };
  }

  get length(): number {
    return this.#items.length;
  }

  add(values: { [key: string]: Value<Instance> }): CollectionItem { 
    
    try {
      const order  = this.#items.length + 1;
      // @ts-ignore
      const record = new this.#model({ order, ownerId: this.#owner.id });
      const item   = new CollectionItem(this.#model, record);
      for(let key in values) {
        item[key] = values[key];
      }
      this.#items.push(item);
      
      return item;
    } catch (error) {
      throw new Error(`Can't add item to '${this.#owner.type()}' collection '${this.#model.name}': ${error}`);
    }
  } 

  async filter(conditions: Conditions<T>, handler: Function) {

    for(let item of this) {
      if(conditions) {
        let fits = true;
        for(let condition in conditions) {
          if(Object.getOwnPropertyDescriptor(item, condition)) {
            if(item[condition] !== conditions[condition]) {
              fits = false;
            }
          }
        }
        if(fits) {
          handler(item);
        }
      } else {
        handler(item);
      }
    }
  }

  removeAll(): void {
    this.#items = [];
    this.#revoveAllCallback();
  }
}

declare type Conditions<T> = {
  [ptroperty in keyof T]: any;
};

export default class Collection<T extends Instance> {

  #model: DataBaseModel;
  #ownerRecord: any;
  #owner: T;
  #items: [] | CollectionItems<T>;
  #createHandler: Function;

  constructor(owner: T, ownerRecord: any, model: DataBaseModel, callback: Function) {

    this.#owner = owner;
    this.#ownerRecord = ownerRecord;
    this.#model = model;

    callback(
      async(saveOptions: SaveOptions): Promise<void> => {

        try {
          // @ts-ignore
          await this.#model.destroy({ 
            // @ts-ignore
            where: { ownerId: this.#owner.id },
            transaction: saveOptions.transaction 
          });
          await this.#createHandler({ transaction: saveOptions.transaction });
        } catch (error) {
          throw new Error(`Can't create collection items: ${error}`);
        }
      }
    );
  }

  async items(): Promise<CollectionItems<T>> {

    const factory = (items: any) => {
      return new CollectionItems(this.#model, this.#owner, items, (handler: Function) => {
        this.#createHandler = handler;
      }, () => { this.#items = [] });
    }

    try {
      if(this.#items) {
        if(this.#items?.length) {
          return this.#items as CollectionItems<T>;
        } else {
          this.#items = factory([])
          return this.#items;
        }
      } else {
        const items = await this.#ownerRecord[`get${this.#model.modelName}`]();
        this.#items = factory(items);
        return this.#items;
      }
    } catch (error) {
      throw new Error(`Can't get '${this.#owner.type()}' collection '${this.#model.name}': ${error}`);
    }
  }
}