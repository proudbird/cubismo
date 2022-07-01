import { DB } from "../types_";
import Utils from '../../../common/Utils';

type Store = { sources: Map<string, DB.IDataSource>, fields: Map<string, DB.IField> }

export default function BuildRawSQLQuery(dataSet: DB.IDataSet, store: Store): string {

  let result = '';

  result += addTempTables(store.sources);

  return result;
}

function addTempTables(sources: Map<string, DB.IDataSource>): string {

  let result = '';

  for(let dataSource  of Array.from(sources, ([name, value]) => value)) {
    if(dataSource.type === DB.DataSourceType.TEMP_SOURCE) {
      const fields     = dataSource.fields;
      const columns    = describeColumns(fields);
      const tableName  = dataSource.tableName;
      const insertions = defineInsertions(fields, (dataSource as DB.ITempDataSource).source);
      result += `CREATE TEMP TABLE ${tableName} (${columns.join(', ')});\n`;
      if(insertions.length) {
        result += `INSERT INTO ${tableName} VALUES ${insertions.join(', ')};\n`;
      }
    }
  }
  return result;
}

function describeColumns(fields: DB.IField[]): string[] {

  const columns = [];
  for(let field of fields) {
    columns.push(defineColumn(field));
  }

  return columns;
}

function defineColumn(field: DB.IField) {

  let definition: string;

  const type = defineType(field.dataType, field.length, field.scale);
  definition = `${field.fieldName} ${type}`;

  return definition;
}

function defineType(dataType: DB.DataType, length: number, scale: number): string {
  
  const map = {
    'STRING' : `VARCHAR(${length})`,
    'NUMBER' : `NUMERIC(${length},${scale})`,
    'BOOLEAN': `BOOLEAN`,
    'DATE'   : `TIMESTAMP`
  }
  
  const result: string = map[dataType];
  if(!result) {
    throw new Error(`Data tape '${dataType}' is not registered among database types`);
  }
  
  return result;
}

function defineInsertions(fields: DB.IField[], source: DB.ITempSource): string[] {

  const insertions = [];
  for(let entry of source) {
    const values = defineValues(fields, entry);
    insertions.push(`(${values.join(', ')})`);
  }

  return insertions;
}

function defineValues(fields, entry) {

  const values = [];
  for(let fieldName in fields) {
    const field = fields[fieldName];
    const value = adoptValue(Utils.get(entry, field.fieldId), field.type.dataType);
    switch (field.type.dataType) {
      case 'STRING':
        values.push(`'${value || ''}'`);
        break;
      case 'DATE':
        values.push(`'${(value || new Date(1, 1, 1, 0 , 0, 0, 0)).toISOString()}'`);
        break;
      default:
        values.push(value);
    } 
  };

  return values;
}

function adoptValue(value, dataType) {

  switch (dataType) {
    case 'STRING':
      return value || '';
    case 'NUMBER':
      value = Number(value);
      if(Utils.isNaN(value)) {
        value = 'NULL';
      }
      return value;
    case 'BOOLEAN':
      return Boolean(value);
    case 'DATE':
      return value || new Date(1, 1, 1, 0 , 0, 0, 0);
  } 
}