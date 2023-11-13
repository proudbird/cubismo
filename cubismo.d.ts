/// <reference types="node" />
/// <reference types="lodash" />
/// <reference types="moment" />
/// <reference types="bcryptjs" />
/// <reference types="jest" />
/// <reference types="dataroll" />

/**
 * Reference to the context of the module
 */
declare type Context = {
  [key: string]: any
}

declare function t(key: string): string

declare interface ICube {
  t(key: string): string
}

declare const Cube: ICube;

declare const me: Context;

/**
 * Imports module like node.js 'require' builtin function, but 
 * in the safe mode
 * 
 * @param {string} id module name
 * @returns {any} the module `exports` object
 */
 declare function Import(id: string): any

declare interface IUtils extends _.LoDashStatic {
  sid(): string,
  moment(): moment.Moment,
  moment(date: Date): moment.Moment,
  moment(date: string): moment.Moment,
  generateCode(mask: string, options?: CodeGeneratorOptions): string,
  testValidity(value: any, rule: RuleTest, errorAnnotation: string): void
  testValidity(value: any, rule: RuleTest, etalon: any, errorAnnotation: string): void
  bcrypt: BCrypto
  perform(handler: Function, params: any[], attempts: number): Promise<any>
  performSync(handler: Function, params: any[], attempts: number): void
}

declare interface BCrypto {
  hash(s: string, salt: number | string): Promise<string>;
  ompare(s: string, hash: string): Promise<boolean>;
}

declare type CodeGeneratorOptions = {
  alphanumericChars: string
}

declare type RuleTest = 'email' | 'identificator' | 'positive' | 'less';

/**
 * Provides utility functions for common programming tasks (build on Lodash library)
 * @global
 */
declare const Utils: IUtils

declare interface global {
  DateFormats: string
}

declare class ApplicationBaseClass {

  static Query: Query
  static setApiHandler(request: string, handler: Function, needAuthenication: boolean): void
  static fs: FS
  static translate(article: string, locale?: string): string
  static env: Environments
  static users: Users
}

declare interface Users {

  

  ['new'](): User
  findOne(options?: SelectOptions): Promise<User>
  findAll(options?: SelectOptions): Promise<User[]>

}

declare interface User {

  id: string,
  name: string,
  login: string,
  email: string, 
  password: string,
  save(): Promise<User>,
  testPassword(value: string): boolean
}

declare type Environments = {
  [key: string]: string
}

declare class FS {

  existsSync(fileName: string): boolean
  readFileSync(fileName: string, encoding?: 'utf-8'): string
  readFile(fileName: string, encoding?: 'utf-8'): Promise<string>
  writeFileSync(fileName: string, data: string, encoding?: 'utf-8'): void
}

interface Query {

  execute(options: QueryStatement): Promise<QuerySelectItem[]>;
  raw(sqlString: string);
}

interface QuerySelectItem {
  [key: string]: any
}

declare type QueryStatement = {
  /**
   * A list of fields
   */
  select   : Fields,
  from     : QueryFromStatement | [QueryFromStatement, string],
  distinct?: boolean,
  cases   ?: CaseStatement[],
  joins   ?: (InnerJoinStatement|LeftJoinStatement|RightJoinStatement|FullJoinStatement)[],
  where   ?: BooleanStatement | ConditionStatement,
  groupBy ?: GroupByStatement,
  orderBy ?: OrderByStatement,
  limit   ?: number,
  offset  ?: number, 
  as      ?: string 
  with    ?: {
    [key: string]: QueryStatement
  },
  unionAll?: QueryStatement[],
  orderAllBy?: OrderByStatement,
}

declare type QueryFromStatement = MetaDataObjectName | QueryStatement | Dataroll;

declare type Field = string;
/**
 * field names of the table you want to select data from
 */
declare type Fields = '*' | string;
declare type MetaDataObjectName = string;

declare type InnerJoinStatement = { innerJoin: JoinStatement };
declare type LeftJoinStatement  = { leftJoin:  JoinStatement };
declare type RightJoinStatement = { rightJoin: JoinStatement };
declare type FullJoinStatement  = { fullJoin:  JoinStatement };
declare type JoinStatement = {
  select?: Fields,
  cases ?: CaseStatement[],
  from   : QueryFromStatement | [QueryFromStatement, string],
  on     : OnClause
}

declare type ConditionValue = string | number | boolean | Date | ConditionValue[] | null | any;

declare type OnClause = Field[] | ConditionStatement;

declare type ConditionStatement = Equal | Greater | Less | GreaterOrEqual | LessOrEqual | NotEqual | Between | Like | In;
declare type BooleanStatement = And | Or | Not;

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
declare type In             = { in: [Field, ConditionValue[]] };

declare type CaseStatement = [[ConditionStatement, CaseValue], CaseValue];
declare type CaseValue     = string | number | boolean | Date | Field | null;

declare type GroupByStatement = Field[];
declare type OrderByStatement = Field[];

declare interface Module {

}

declare type Value<T extends CatalogsInstance<T>> = string | number | boolean | Date | Enum | Promise<T>;

declare interface ConstantsManager<T> {
  
  getValue(lang?: string): Promise<T>;
  setValue(value: any, lang?: string): Promise<void>;
}

declare interface CatalogsInstance<T> {
  
  id: string;

  Name: string;

  Code: string|number;

  Owner: CatalogsInstance<T>;

  Parent: CatalogsInstance<T>;

  isFolder(): boolean;

  save(): Promise<T>;
}

declare interface CatalogsManager<T extends CatalogsInstance<T>> {
  
  ['new'](properties?: Partial<T>): T;

  findOne(options?: SelectOptions): Promise<T | null>;
  findAll(options?: SelectOptions): Promise<[T]>;
}

declare interface RegistratorsRegistrator<T> {
  
  id: string;

  Date: Date;

  Number: string|number;

  booked?(): boolean;

  save(): Promise<T>;
}

declare interface RegistratorsManager<T extends RegistratorsRegistrator<T>> {
  
  ['new'](properties?: NewItemPoperties): T;

  findOne(options?: SelectOptions): Promise<T | null>;
  findAll(options?: SelectOptions): Promise<[T]>;
}

declare type NewItemPoperties = {

  [key:string]: any
}

declare type SelectOptions = {

  where: {
    [key:string]: any
  }
}

declare interface DataSetsRecord<T> {
  
  title: string;
  
  description: string;

  save(): Promise<void>;
}

declare interface DataSetsManager<T extends DataSetsRecord<T>> {
  
  /**
   * Creates new DataSet record
   * 
   * @param {object} properties predefined record properties
   * @returns {DataSetRecord} new DataSet record
   */
   newRecord(properties?: NewItemPoperties): T

  /**
   * Search for a single catalog item. Returns the first item found, or null if none can be found.
   * 
   * @param {object} options A hash of options to describe the conditions of the search
   * @returns {Promise<CatalogInstance|null>} found catalog item if exists or `null`, if not
   */
   findOne(options?: SelectOptions): Promise<T|null>
}

/**
 * 
 */
 declare interface Collections<T> {
  
  items(): Promise<Collection<T>>
}

/**
 * 
 */
 declare interface Collection<T> {
  
  add(values?: { [Property in keyof T]: T[Property] }): T;
  filter(conditions: Conditions<T>, handler: Function): Promise<void>
  forEach(iteratee: any): void
  findOne(options?: SelectOptions): Promise<T | null>;
  removeAll(): void
}

declare type Conditions<T> = {
  [ptroperty in keyof T]?: any;
};

/**
 * A separate item of the catalog
 */
 declare interface CollectionsItemInstance<T extends CatalogsInstance<T>> {
  
  Owner: T

}

/**
 * A separate item of the registrator
 */
 declare interface CollectionsItemRegistrator<T extends RegistratorsRegistrator<T>> {
  
  Owner?: T

}

declare class Enum {

  id: string;

  name: string;

  title: string;
}

declare namespace HTTP {
  type Request = {
    user?: User
    body: RequestBody
    [key: string]: any
  }
  class Response  {
    setHeader(headerName: string, value: string): void
    send(body: any): void
    status(code: number): Response
  }
  type Next = {
    (err?: any): void;
    /**
     * "Break-out" of a router by calling {next('router')};
     * @see {https://expressjs.com/en/guide/using-middleware.html#middleware.router}
     */
    (deferToNext: 'router'): void;
    /**
     * "Break-out" of a route by calling {next('route')};
     * @see {https://expressjs.com/en/guide/using-middleware.html#middleware.application}
     */
    (deferToNext: 'route'): void;
    (req: Request, res: Response): void
  }

  type RequestBody = {
    
    [property: string]: any
  }
}

