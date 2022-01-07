import Application from '../../classes/application/Application';
import BuildDataSet from './helpers/BuildDataSet';
import BuildRawSQLQuery from './helpers/BuildRawSQLQuery';
import { DB, IQueryExecuter, Lang } from './types_';

export class DataSet implements DB.IDataSet {

  #application: Application
  #models     : DB.IApplicationDataModel
  #executer   : IQueryExecuter
  #sources    : Map<string, DB.IDataSource>
  #fields     : Map<string, DB.IField>

  public sources    : DB.IDataSource[]
  public fields     : DB.IField[]
  public joins     ?: DB.IJoin[]
  public conditions?: DB.ICondition[]
  public grouppings?: DB.IGroupping[]
  public orderings ?: DB.IOrdering[]
  public lang       : Lang

  constructor(application: Application, models: DB.IApplicationDataModel, executer: IQueryExecuter) {

    this.#application = application;
    this.#models      = models;
    this.#executer    = executer;
    this.#sources     = new Map;
    this.#fields      = new Map;

    this.sources    = [];
    this.fields     = [];
    this.joins      = [];
    this.conditions = [];
    this.grouppings = [];
    this.orderings  = [];
    this.lang       = application.lang as Lang;
  }

  build(query: DB.IQueryStatement): void {

    BuildDataSet(this, query);
  }

  getData(): DB.IDataRecords {
    
    const store = { sources: this.#sources, fields: this.#fields };
    const rawSQLQuery = BuildRawSQLQuery(this, store);
    return this.#executer.query(rawSQLQuery);
  }
}