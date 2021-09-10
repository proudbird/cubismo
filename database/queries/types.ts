import { DataBaseModel, DataBaseModels } from "../types";

export declare type QueryStatement = {
  select   : Fields,
  from     : MetaDataObjectName| DataBaseModel | QueryStatement,
  distinct?: boolean,
  cases   ?: CaseStatement[],
  joins   ?: (InnerJoinStatement|LeftJoinStatement|RightJoinStatement|FullJoinStatement)[],
  where   ?: BooleanStatement | ConditionStatement,
  groupBy ?: GroupByStatement,
  orderBy ?: OrderByStatement,
  limit   ?: number,
  offset  ?: number
}

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

export declare type ConditionStatement = Equal | Greater | Less | GreaterOrEqual | LessOrEqual | NotEqual | Between | Like | In | IsNull | IsNotNull | IsTrue | IsFalse;
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
declare type In             = { in: [Field, ConditionValue[]] | QueryStatement };
declare type IsNull         = { isNull: Field }; 
declare type IsNotNull      = { isNotNull: Field };
declare type IsTrue         = { isTrue: Field };
declare type IsFalse        = { isFalse: Field };

declare type CaseStatement = [[ConditionStatement, CaseValue], CaseValue];
declare type CaseValue     = string | number | boolean | Date | Field | null;

declare type GroupByStatement = Field[];
declare type OrderByStatement = Field[];

export declare type QuerySchema = {
  fields: Map<string, FieldDefinition>,
  from: SourceDefinition,
  joins?: JoinsMap,
  where?: BooleanConditionDefinition | ConditionDefinition,
  tables: TablesMap,
  models: DataBaseModels,
  sources: Map<string, SourceDefinition>
}

export declare type FieldDefinition = {
  name: string,
  alias?: string,
  tableId: string,
  model: DataBaseModel,
  fieldId: string,
  functioin?: QueryFunction,
  dataType: string
}

declare type QueryFunction = 'MIN' | 'MAX' | 'COUNT' | 'AVG' | 'SUM';

export declare type SourceDefinition = {
  name?: string,
  alias?: string,
  tableId?: string,
  model?: DataBaseModel
}

export declare type ConditionDefinition = {
  field: FieldDefinition & { tableAlias: string},
  etalon: ValueDefinition,
  operation: ComparisonOperatorType
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