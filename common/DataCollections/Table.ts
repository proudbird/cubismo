import StringDefinition from "../StringDefinition";
import DataTypeDefinition from "../DataTypeDefinition";
import { RangeErrors } from "../../errors/Errors";
import { TestValidity } from "../Validators";
import DataType from "../DataType";

import Utils from '../../common/Utils';

type MetaDataType = '';

export default class Table {

  #columns: TableColumnCollection;
  get columns(): TableColumnCollection {
    return this.#columns;
  }

  #rows:  TableRow[];

  constructor() {
    this.#columns = new TableColumnCollection();
    this.#rows = [];
  }

  [Symbol.iterator] = function() {

    let count = 0;
    let isDone = false;

    let next = () => {
       if(count >= this.#rows.length) {
          isDone = true;
       }
       return { done: isDone, value: this.#rows[count++] };
    }

    return { next };
  };

  addRow(value: any): TableRow {
    const newRow = new TableRow(value, this.#columns);
    this.#rows.push(newRow);
    return newRow;
  }

  load(data: any[] | Table, map: PropertyMap) {
    for(let record of data) {
      this.addRow(mapValues(record, map));
    }
  }
}

class TableColumnCollection {

  #columns: TableColumn[];

  constructor() {
    this.#columns = [];
  }

  [Symbol.iterator] = function() {

    let count = 0;
    let isDone = false;

    let next = () => {
       if(count >= this.#columns.length) {
          isDone = true;
       }
       return { done: isDone, value: this.#columns[count++] };
    }

    return { next };
  };

  add(name: string, type?: DataTypeDefinition | DataType<MetaDataType>, title?: string): TableColumn {
    const newColumn = new TableColumn(name, type, title, this.#columns.length);
    this.#columns.push(newColumn);
    return newColumn;
  }

  remove(index: number): void {
    TestValidity(index, 'less', this.#columns.length, `Can't remove column from table`);

    this.#columns.splice(index, 1);
  }
}

class TableColumn {

  #name: string;
  get name(): string {
    return this.#name;
  }

  #title: string;
  get title(): string {
    return this.#title;
  }

  #type: DataTypeDefinition | DataType<MetaDataType>;
  get type(): string {
    return this.#type.toString();
  }

  #index: number;
  get index(): number {
    return this.#index;
  }

  constructor(name: string, type: DataTypeDefinition | DataType<MetaDataType>, title: string, index: number) {
    TestValidity(name, 'identificator', `Can't add column with name ${name}`);

    this.#name = name;
    this.#title = title;
    this.#index = index;
    this.#type = type;

  }
}

class TableRow {

  constructor(value: any, columns: TableColumnCollection) {
    for(let column of columns) {
      Object.defineProperty(this, column.name, {
        get(): any {
          return Utils.get(value, column.name);
        },
        set(value: any) {
          this[column.name] = value;
        }
      })
    }
  }
}

export type PropertyMap = {
  [key: string]: string
}

function mapValues(record: any, map: PropertyMap) {
  const addopted = {};
  for(let key in map) {
    addopted[key] = Utils.get(record, map[key]);
  }
  return addopted;
}