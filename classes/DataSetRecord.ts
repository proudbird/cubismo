import { DataBaseModel, SaveOptions } from '../database/types';
import Instance from './Instance';

export default class DataSetRecord extends Instance {

  #model   : any;
  #record  : any;

  constructor(model: DataBaseModel, record: any) {

    super(model, record);

    this.#model  = model;
    this.#record = record;
  }
}