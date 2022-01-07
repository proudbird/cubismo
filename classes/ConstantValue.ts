import { DataBaseModel, ModelAttributeDefinition, Value } from '../database/types';
import { MetaDataTypes, isTypeOf } from '../common/Types';
import Instance from './Instance';
import Enum from './Enum';

export default class ConstantValue {

  #model   : DataBaseModel;
  #record  : any;

  constructor(model: DataBaseModel, record: any) {

    this.#model  = model;
    this.#record = record;
  }

  type(): string {
    return this.#model.name;
  }
}