import Utils from '../../common/Utils';

export default class DataTable {

  #columns: DataTableColumns;
  source: any[];
  definition: SourceDefinition;
  validator: Function;
  
  constructor(source: any[], definition: SourceDefinition, validator?: Function) {
    this.source = source;
    this.definition = definition;
    this.validator = validator;
    this.#columns = new DataTableColumns(definition);
  }

  forEach(handler: Function): void {

    function defineValue(value, type: DataType, length: number = 0, scale: number = 0) {

      switch (type) {
        case 'S':
          if(value && length) {
            value = value.toString().slice(0, length);
          }
          break;
        case 'N':
          if(scale > 0) {
            value = parseFloat(value);
          } else {
            value = parseInt(value);
          }
          break;
        case 'B':
          value = Boolean(value);
          break;
        case 'D':
          value = new Date(value);
          value.setHours(value.getHours() + length);
          break;
        default:
          break;
      }

      return value;
    }

    const validator = this.validator;

    function defineRecord(entry: any, 
      definition: SourceDefinition | AttributeValueDescriptor, 
      record?: any,
      lastLevel: boolean = true) {

      definition = definition as SourceDefinition;

      const v = definition.root && definition.root !== '#';
      if(v) {
        entry = Utils.get(entry, definition.root);
      }

      if(definition.multiple && entry.length) {
        const entryDefinition = { ...definition, root: '#', multiple: false }
        for(let item of entry) {
          defineRecord(item, entryDefinition, record, lastLevel);
        }
        return;
      }

      record = record || {};

      for(let attribute of definition.attributes) {
        for(let key in attribute) {
          const descriptor = attribute[key];
          const length = descriptor.length > 2 ? descriptor[2] : 0;
          const scale = descriptor.length > 3 ? descriptor[3] : 0;
          if(definition.handler) {
            const value = definition.handler(entry, descriptor[0]);
            record[key] = defineValue(value, descriptor[1], length, scale);
          } else if(descriptor[0] === '#') {
            record[key] = defineValue(entry, descriptor[1], length, scale);
          } else {
            const value = Utils.get(entry, descriptor[0]);
            record[key] = defineValue(value, descriptor[1], length, scale);
          }
        }
      }

      if(definition.subsets) {
        lastLevel = false;
        for(let subset of definition.subsets) {
          defineRecord(entry, subset, record, lastLevel);
          if(!subset.subsets) {
            lastLevel = true;
          }
        }
      }

      if(!definition.subsets && lastLevel) {
        if(validator) {
          if(validator(record)) {
            handler(record);
          }
        } else {
          handler(record);
        }
      }
    }

    for(let entry of this.source) {
      defineRecord(entry, this.definition);
    }
  }

  get columns() {
    return this.#columns;
  }
}

class DataTableColumns {

  #columns: DataTableColumnDescriptor[];

  constructor(definition: SourceDefinition) {
    this.#columns = defineColumns(definition);
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
  }
}

class DataTableColumnDescriptor {

  name: string;
  dataType: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE';
  length: number;
  scale: number;

  constructor(name: string, dataType: string, length?: number, scale?: number) {
    
    const dataTypeMap = {
      'S': 'STRING',
      'N': 'NUMBER',
      'B': 'BOOLEAN',
      'D': 'DATE'
    };

    this.name     = name;
    this.dataType = dataTypeMap[dataType];
    this.length   = length;
    this.scale    = scale;
  }
}

function defineColumns(definition: SourceDefinition): DataTableColumnDescriptor[] {
  
  const columns: DataTableColumnDescriptor[] = [];

  function addColumns(columns: DataTableColumnDescriptor[], definition: SourceDefinition): void {

    for(let attribute of definition.attributes) {
      for(let key in attribute) {
        const description = attribute[key];
        const dataType  = description[1];
        const length    = description.length > 2 ? description[2] : 0;
        const scale     = description.length > 3 ? description[3] : 0;
        const descriptor = new DataTableColumnDescriptor(key,dataType, length, scale);
        columns.push(descriptor);
      }
    }

    if(definition.subsets) {
      for(let subset of definition.subsets) {
        addColumns(columns, subset);
      }
    }
  }

  addColumns(columns, definition);

  return columns;
}

export type SourceDefinition = {
  attributes: Array<AttributeDefinition>,
  root?: string,
  multiple?: boolean,
  subsets?: SourceDefinition[],
  handler?: Function
}


export type AttributeDefinition = {
  [attribute: string]: AttributeValueDescriptor
}

export type AttributeValueDescriptor = [string?, DataType?, number?, number?];

export type DataType = 'S'|'N'|'B'|'D';


global["DataTable"] = DataTable;

