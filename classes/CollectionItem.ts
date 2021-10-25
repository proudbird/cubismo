import Instance from './Instance';

export default class CollectionItem extends Instance {

  #model : any;
  #record: any;

  constructor(model: any, record: any) {

    super(model, record);

    this.#model  = model;
    this.#record = record;
  }

  get Owner(): Promise<Instance> {
    return this.getValue('Owner') as Promise<Instance>;
  }

  get Order(): number {
    
    try {
      return this.#record.getDataValue('order');
    } catch (error) {
      throw new Error(`Can't get '${this.#model.name}' property 'Order': ${error}`);
    }
  }
}