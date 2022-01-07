import _ from 'lodash';

/////////////////////////////////////////////////
export type SourceDefinition = {
  attributes: Array<AttributeDefinition>,
  subset   ?: SourceDefinition,
  root     ?: string
}

type AttributeDefinition = {
  [attributeName: string]: AttributeValueDescriptor
}

type AttributeValueDescriptor = [string?, AttributeType?, number?, number?, Function?, ...[]];

type AttributeType = 'S'|'N'|'B'|'D';
type DataType = 'STRING'|'NUMBER'|'BOOLEAN'|'DATE';
type ValueType = string|number|boolean|Date;

/////////////////////////////////////////////////
export default class DataSet {

  #columns  : DataSetColumnDescriptor[];
  #entries  : any[];
  
  constructor(public source: any[], public definition: SourceDefinition, public validator?: Function) {
    
    this.#columns   = defineColumns(definition);
    this.#entries   = [];

    this.source     = source;
    this.definition = definition;
    this.validator  = validator;
  }

  [Symbol.iterator] = () => {

    const state = initState(this.source, this.definition);
    let entry   = {};
    let index   = 0;

    const next = () => {
      const result = defineRecord(state, entry);
      this.#entries.push(result.value);
      return result;
    }

    const nextByEntries = () => {
      const done = (index = this.#entries.length - 1);
      return { done: done, value: this.#entries[index]};
    }

    return this.#entries.length ? { next: nextByEntries } : { next };
  }

  get entries() {

    populate(this, this.#entries);
    return this.#entries;
  }

  get length() {

    populate(this, this.#entries);
    return this.#entries.length;
  }

  get columns() {

    return this.#columns;
  }
}

class DataSetColumnDescriptor {

  public dataType: DataType; 
  constructor(public name: string, type: AttributeType, public length?: number, public scale?: number) {
    
    const dataTypeMap = {
      'S': 'STRING',
      'N': 'NUMBER',
      'B': 'BOOLEAN',
      'D': 'DATE'
    };

    this.name     = name;
    this.dataType = dataTypeMap[type] as DataType;
    this.length   = length;
    this.scale    = scale;
  }
}

/////////////////////////////////////////////////
function initState(source: any, definition: any, state = undefined, root = '#') {

  state = state || { root, [root]: {  branch: source[Symbol.iterator](), definition: definition }};
  if(definition.subset) {
    const parentRoot = root;
    root += `.${definition.subset.root}`
    state[root] = { definition: definition.subset, parent: parentRoot };
    initState(source, definition.subset, state, root);
  }

  return state;
}

function defineRecord(state: any, record: any):  { done: boolean, value: any } {

  const current = state[state.root];
  const { done, value } = current.branch.next();

  for(let attribute of current.definition.attributes) {
    for(let key in attribute) {
      record[key] = getPropertyValue(value, attribute[key]);
    }
  }

  if(done && state.root === '#') {
    return { done: true, value: record };
  } else if(done && !value) {
    state.root = current.parent;
    return defineRecord(state, record);
  } else if(done) {
    state.root = current.parent;
    return { done: false, value: record };
  }

  if(current.definition.subset) {
    const nextRoot   = state.root + '.' + current.definition.subset.root;
    const nextState  = state[nextRoot];
    nextState.branch = value[current.definition.subset.root][Symbol.iterator]();
    state.root = nextRoot;
    return defineRecord(state, record);
  } else {
    return { done: false, value: record };
  }
}

function getPropertyValue(node: any, descriptor: AttributeValueDescriptor): ValueType {

  let result = undefined;
  const [property, type, length, scale, handler, args] = descriptValue(descriptor);
  const value = _.get(node, property);
  if(handler) {
    result = defineValue(handler(value, ...args), type, length, scale);
  } else if(property === '*') {
    result = defineValue(node, type, length, scale);
  } else {
    result = defineValue(value, type, length, scale);
  }

  return result;
}

function descriptValue(descriptor: AttributeValueDescriptor):
    [string, AttributeType, number, number, Function, any[]] {

  function changeIfFunction<T extends number|AttributeType>(param: any, defaultValue: T): 
      [T extends number ? number : AttributeType, Function|undefined] {

    let handler: Function;
    if(_.isFunction(param)) {
      handler = param;
      param   = defaultValue || 0;
    } else {
      param = param || defaultValue;
    }

    return [param, handler];
  }

  let property = descriptor[0];
  let type     : AttributeType;
  let length   : number;
  let scale    : number;
  let handler  : Function;
  let args     : any[] = [];

  if(descriptor.length > 1) {
    type = descriptor[1];
    [type, handler] = changeIfFunction(type, 'S');
  }
  if(descriptor.length > 2) {
    length = descriptor[2];
    [length, handler] = changeIfFunction(length, 0);
    args = descriptor.slice(3) || args;
  }
  if(descriptor.length > 3) {
    scale = descriptor[3];
    [scale, handler] = changeIfFunction(scale, 0);
    args = descriptor.slice(4) || args;
  }
  if(descriptor.length > 4) {
    let argIndex = 4;
    if(!_.isFunction(handler)) {
      handler = descriptor[4];
      argIndex++;
    }
    args = descriptor.slice(argIndex) || args;
  }

  return [property, type, length, scale, handler, args];
}

const valueTypeMap: { [K in AttributeType]?: Function } = {
  'S': getStringValue,
  'N': getNumberValue,
  'B': getBooleanValue,
  'D': getDateValue
}

export function getStringValue(input: ValueType, length?: number): string {
  
  let result = input ? input.toString() : '';
  if(typeof input === 'boolean') {
    result = input.toString();
  }
  if(length) {
    result = result.slice(0, length);
  }

  return result;
}

export function getNumberValue(input: ValueType, length?: number, scale: number = 0): number {
  
  if(length === 0) {
    throw new Error(`Length of a number value can't be 0`);
  }
  if(typeof input === 'string') {
    input = input.replace(/\,/g, '.')
  }
  let result = Number(input);
  if(_.isNaN(result)) {
    return 0;
  }
  input = result.toString();
  if(scale > 0) {
    input = result.toFixed(scale);
    result = parseFloat(input);
  } else {
    result = Math.round(result);
    input = result.toString();
  }
  if(length && input.replace(/\./g, '').length > length) {
    const template = '999999999999999999999999999999999999999999999999999999999999999';
    input = `${template.slice(0, length - scale)}.${template.slice(0, scale)}`;
    result = Number(input);
  }

  return result;
}

export function getBooleanValue(input: boolean | string | number): boolean {

  return Boolean(input);
}

export function getDateValue(input: string): Date {

  let result: Date = null;
  try {
    result = new Date(input);
  } catch (error) {
    //TODO: should we throw an error?
  }

  return result;
}

function defineValue(input: any, type: AttributeType, length: number = 0, scale: number = 0) {

  const handler = valueTypeMap[type];
  if(!handler) {
    throw new Error(`Attribute type ${type} not defined`);
  }

  return handler(input, length, scale);
}

function populate(dataSet: DataSet, entries: any[]): void {
  
  if(!entries.length) {
    for(let entry of dataSet) {
      entries.push(entry);
    }
  }
}

function defineColumns(definition: SourceDefinition): DataSetColumnDescriptor[] {
  
  const columns: DataSetColumnDescriptor[] = [];

  function addColumn(definition: SourceDefinition): void {

    for(let attribute of definition.attributes) {
      for(let key in attribute) {
        const description = attribute[key];
        const dataType    = description[1];
        const length      = description.length > 2 ? description[2] : 0;
        const scale       = description.length > 3 ? description[3] : 0;
        const descriptor  = new DataSetColumnDescriptor(key, dataType, length, scale);
        columns.push(descriptor);
      }
    }

    if(definition.subset) {
      addColumn(definition.subset);
    }
  }

  addColumn(definition);

  return columns;
}