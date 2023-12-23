import { DataBaseModel, DataBaseModels, ModelDefinition } from "../types";
import DataTable from "../../common/DataCollections/DataSet";
import Application from "../../classes/application/Application";

export declare type QueryStatement = {
  /**
   * A list of fields
   */
  select   : Fields | '*',
  from     : QueryFromStatement | [QueryFromStatement, string],
  distinct?: boolean,
  cases   ?: CaseStatement[],
  joins   ?: (InnerJoinStatement|LeftJoinStatement|RightJoinStatement|FullJoinStatement)[],
  where   ?: BooleanStatement | ConditionStatement,
  groupBy ?: GroupByStatement,
  orderBy ?: OrderByStatement,
  limit   ?: number,
  offset  ?: number,
  as      ?: string,
  with?: WithStatement;
  unionAll?: QueryStatement[];
  orderAllBy?: OrderByStatement;
}

export declare type QueryFromStatement = MetaDataObjectName | DataBaseModel | QueryStatement | DataTable;

declare type Field = string;
/**
 * field names of the table you want to select data from
 */
declare type Fields = '*' | string;
declare type MetaDataObjectName = string;

export declare type InnerJoinStatement = { innerJoin: JoinStatement };
export declare type LeftJoinStatement  = { leftJoin:  JoinStatement };
export declare type RightJoinStatement = { rightJoin: JoinStatement };
export declare type FullJoinStatement  = { fullJoin:  JoinStatement };
export declare type JoinStatement = {
  select : Fields,
  cases ?: CaseStatement[],
  from   : MetaDataObjectName | QueryStatement,
  on     : OnClause
}

export declare type ConditionValue = string | number | boolean | Date | ConditionValue[] | null | any | QueryStatement;

declare type OnClause = Field[] | ConditionStatement;

export declare type ConditionStatement = Equal | Greater | Less | GreaterOrEqual | LessOrEqual | NotEqual | Between | Like | ILike | In | IsNull | IsNotNull | IsTrue | IsFalse;
export declare type BooleanStatement = And | Or | Not;

declare type And = [BooleanStatement | ConditionStatement, BooleanStatement | ConditionStatement] | { and: [BooleanStatement | ConditionStatement, BooleanStatement | ConditionStatement] };
declare type Or  = { or: [BooleanStatement | ConditionStatement, BooleanStatement | ConditionStatement] };
declare type Not = { not: ConditionStatement };

declare type Equal          = { [field: string]: ConditionValue } | { equal: [Field, ConditionValue] };
declare type Greater        = { greater: [Field, ConditionValue] };	
declare type Less           = { less: [Field, ConditionValue] }; 	
declare type GreaterOrEqual = { greaterOrEqual: [Field, ConditionValue] }; 	
declare type LessOrEqual    = { lessOrEqual:  [Field, ConditionValue]}; 	
declare type NotEqual       = { notEqual: [Field, ConditionValue] };
declare type Between        = { between: [Field, ConditionValue, ConditionValue] };
declare type Like           = { like: [Field, ConditionValue] };
declare type ILike          = { iLike: [Field, ConditionValue] };
declare type In             = { in: [Field, ConditionValue[]] | QueryStatement };
declare type IsNull         = { isNull: Field }; 
declare type IsNotNull      = { isNotNull: Field };
declare type IsTrue         = { isTrue: Field };
declare type IsFalse        = { isFalse: Field };

declare type CaseStatement = [[ConditionStatement, CaseValue], CaseValue];
declare type CaseValue     = string | number | boolean | Date | Field | null;

declare type GroupByStatement = Field[];
declare type OrderByStatement = Field[];

declare type WithStatement = {
  [name: string]: QueryStatement
}

export declare type QuerySchema = {
  application: Application,
  fields: Map<string, FieldDefinition>,
  additionalFields: Map<string, FieldDefinition>,
  from: SourceDefinition,
  joins?: JoinsMap,
  where?: BooleanConditionDefinition | ConditionDefinition,
  tables: TablesMap,
  models: QueryDataSources,
  sources: Map<string, SourceDefinition>,
  groupBy?: string[],
  orderBy?: string[],
  tempSources?: QueryDataSource[],
  mainSchema?: QuerySchema,
  childSchema?: QuerySchema,
  alias?: string,
  providers?: QueryDataProviders;
  limit?: number;
  offset?: number;
  isConditionSubQuery?: boolean;
}

export type QueryDataProviders = {
  [id: string]: {
    [position: string]: {
      [participator: string]: {
        [connector: string]: QueryDataProvider
      }
    }
  } | QueryDataProvider;
}

export type QueryDataProvider = {
  model: QueryDataSource;
  tableId: string;
  alias: string;
  position: QueryDataProviderPosition;
  participator: QueryDataSource;
  connector: string;
}

export type QueryDataProviderParams = {
  model: QueryDataSource;
  position: QueryDataProviderPosition;
  participator?: QueryDataSource;
  connector?: string;
}

export type QueryDataProviderPosition = 'LEFT' | 'RIGHT';

export declare type FieldDefinition = {
  name: string,
  alias?: string,
  tableId: string,
  model: QueryDataSource,
  parentModel: QueryDataSource,
  fieldId: string,
  functioin?: QueryFunction,
  dataType: ApplicationDataType,
  length?: number,
  scale?: number,
  func?: string,
  provider?: QueryDataProvider,
}

declare type QueryFunction = 'MIN' | 'MAX' | 'COUNT' | 'AVG' | 'SUM';

export declare type SourceDefinition = {
  name?: string,
  alias?: string,
  tableId?: string,
  model?: QueryDataSource,
  tempTable?: boolean,
}

// export interface QueryDataSource {
//   columns: QueryDataSourceColumn[],
//   records: QueryDataSourceRecord[]
// }

// export interface QueryDataSourceColumn {
//   [name: string]: [
//     /**  full path to the value of a data property, devided by '.' */
//     path: string, 
//     /** data type of the value */
//     type: SQLNumericTypes | SQLCharacterTypes | SQLDateTimeTypes | SQLBooleanType,
//     /** in case of numbers - the total count of significant digits in the whole number, 
//      * that is, the number of digits to both sides of the decimal point; in case of strings - 
//      * just the string length */
//     length?: number,
//     /** is the count of decimal digits in the fractional part, to the right of the decimal point */
//     scale?: number
//   ]
// }

export interface QueryDataSourceRecord {
  [field: string]: any
}

export enum SQLNumericTypes {
  SMALLINT = 	'SMALLINT',
  INTEGER	 = 	'INTEGER',
  BIGINT	 = 	'BIGINT',
  DECIMAL	 = 	'DECIMAL',
  NUMERIC	 = 	'NUMERIC',
  REAL	   = 	'REAL',
  FLOAT	   = 	'FLOAT'
}

export enum SQLCharacterTypes {
  VARCHAR	= 	'VARCHAR',
  CHAR	  = 	'CHAR',
  TEXT	  = 	'TEXT',
  BLOB 	  = 	'BLOB '
}

export enum SQLDateTimeTypes {
  TIMESTAMP	= 	'TIMESTAMP',
  DATE	    = 	'DATE',
  TIME	    = 	'TIME'
}

export enum SQLBooleanType {
  BOOLEAN	  = 	'BOOLEAN'
}

export declare type QuerySource = {
  modelName: string,
  tableName: string,
  source: DataBaseModel | QueryDataSource,
  type: SourceType
}

export enum SourceType {
  DATA_BASE_MODEL,
  QUERY_STATEMENT,
  QUERY_DATA_SOURCE
}

export declare type ConditionDefinition = {
  field: FieldDefinition & { tableAlias: string},
  etalon: ValueDefinition,
  operation: ComparisonOperatorType,
  schema: QuerySchema,
}

export declare type BooleanConditionDefinition = {
  type: BitwiseOperatorType,
  conditions: BooleanConditionDefinition | ConditionDefinition[]
}

export declare type ValueDefinition = {
  value: any | QuerySchema,
  isReference?: boolean,
  isSubQuery?: boolean,
  model?: DataBaseModel
}

export enum BitwiseOperatorType {
  AND = 'AND',
  OR  = 'OR',
  NOT = 'NOT'
}

export enum ComparisonOperatorType {
  EQUAL             = '=',
  GREATER           = '>',
  LESS              = '<',
  GREATER_OR_EQUAL  = '>=',
  LESS_OR_EQUAL     = '<=',
  NOT_EQUAL         = '<>',
  BEETWEN           = 'BETWEEN',
  LIKE              = 'LIKE',
  ILIKE             = 'ILIKE',
  IN                = 'IN',
  IS_NULL           = 'IS NULL',
  IS_NOT_NULL       = 'IS NOT NULL',
  IS_TRUE           = 'IS TRUE',
  IS_FALSE          = 'IS FALSE',
}

declare type JoinsMap = { [tableName: string]: JoinDefinition[] };

declare type JoinDefinition = {
  joinType: JoinType
  leftTable: TableDefinition & { on: FieldDefinition}
  rigthTable: TableDefinition & { on: FieldDefinition},
}

export enum JoinType {
  INNER = 'INNER JOIN',
  LEFT = 'LEFT JOIN',
  RIGHT = 'RIGHT JOIN',
  FULL = 'FULL JOIN'
}

export declare type TableDefinition = SourceDefinition;

declare type TablesMap = { [tableId: string]: TableDefinition }

export interface QueryDataSource {
  tableName   : string,
  definition  : QueryDataSourceDefinition,
  name        : string,
  cube?       : string,
  modelName   : string,
  application?: Application,
  dataSource ?: DataTable,
  alias      ?: string,
  sql        ?: string,
  tempTable  ?: boolean,
}

export type QueryDataSources = {
  [key: string]: QueryDataSource
} 

export interface QueryDataSourceDefinition {
  id: string,
  name?: string,
  cube?: string,
  class?: string,
  tableId: string,
  codeLength?: number,
  codeType?: 'STRING' | 'NUMBER',
  nameLength?: number,
  nameLang?: string,
  multilevel?: true,
  owners?: string[],
  ownerModel?: DataBaseModel,
  attributes?: QueryDataSourceAttributes,
  joinedAttributes?: QueryDataSourceAttributes
}

export type QueryDataSourceAttributes = { 
  [name: string]: QueryDataSourceAttribute
}

export type QueryDataSourceAttribute = {
  fieldId: string,
  type: {
    dataType: ApplicationDataType,
    lang?: string[],
    length?: number,
    scale?: number,
    reference?: {
      cube?: string,
      class?: string,
      modelId: string
    }
  }
}

type QueryResultEntry<T> = {
  [field in keyof T]: T[field]
}

export interface QueryResult<T = {}> {
  [Symbol.iterator]():  IterableIterator<QueryResultEntry<T>>;
  forEach(callbackfn: (entry: QueryResultEntry<T>, index: number, source: QueryResult<T>) => void, thisArg?: any): void;
  toJSON(): string;
  readonly length: number;
}

export type TableDataSource = {
  attributes: {
    [name: string]: DataSourceAttribute;
  };
  entries: [TableDataSourceEntry];
  count: number;
}

type TableDataSourceEntry = DataSourceDataType[];

export type DataSourceAttribute = {
  index: number; // index in the entry Array
  name: string;
  title?: string;
  type: DataSourceAttributeType;
}

export type DataSourceAttributeType = {
  dataType: ApplicationDataType;
  dateType?: DateType;
  length?: number;
  scale?: number;
  cube?: string;
  className?: string;
  model?: string;
}

export type ApplicationDataType = 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'ENUM' | 'FK';

export type DateType = 'DATE' | 'DATETIME' | 'TIME';

export type DataSourceDataType = string | number | boolean | null | ReferenceDataType;

export type ReferenceDataType = [
  string, // id
  string, // presentation
]