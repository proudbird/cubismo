import { DB } from './types_';

export class DataSchema implements DB.IDataSchema {

  #dataSets: Map<string, DB.IDataSet>

  public dataSets: DB.IDataSet[]

  constructor() {

    this.#dataSets = new Map;
    this.dataSets  = [];
  }
}