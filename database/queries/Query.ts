import { Sequelize } from 'sequelize';
import Application from '../../classes/application/Application';

import QueryResult from '../QueryResult';

import QueryError from "./QueryError";
import { QueryStatement, QuerySchema, SourceDefinition, TableDefinition, FieldDefinition, LeftJoinStatement, JoinStatement, InnerJoinStatement, RightJoinStatement, FullJoinStatement, JoinType, ConditionStatement, ComparisonOperatorType, BooleanStatement, BooleanConditionDefinition, ConditionDefinition, BitwiseOperatorType, ValueDefinition, SourceType, QuerySource, QueryDataSource, QueryDataSources, QueryDataSourceAttributes, QueryDataSourceAttribute, QueryDataSourceDefinition, QueryDataProvider, ApplicationDataType } from "./types";
import { DataBaseModel, ModelAttributeDefinition, DataBaseTableDefinition, DataBaseModels } from "../types";
import DataTable from "../../common/DataCollections/DataSet";
import { writeFileSync } from 'fs';
import Utils, { sid } from '../../common/Utils';
import Dataroll from 'dataroll';


export default class Query {

  #driver: Sequelize;
  #application: Application;

  constructor(application: Application, driver: Sequelize) {

    this.#application = application;
    this.#driver = driver;
  }

  async execute(options, model?, subscriber?) {
    const self = this;

    if (!options) {
      options = {};
    }

    let raw = false;
    if (!model) {
      raw = true;
    }

    if (!model && typeof options.FROM === "string") {
      model = this.#driver.models[options.FROM];
    }

    let queryModel = model;
    if (raw) {
      queryModel = undefined;
    }

    // try {
    let select: QueryResult | [] = [];
    const models = ((this.#driver.models as unknown) as QueryDataSources)
    const query = await buildSQLQuery(this.#application, models, options);
    // writeFileSync('c:\\ITProjects\\cubismo\\workspaces\\optima\\sql.txt', query.sql);
    const matches = /at async (.*) \(.*cubismo\.apps\/cubes\/(.*)\)/.exec((new Error()).stack);
    if (matches) {
      const id = `${matches[1]}_${matches[2]}`.replace('.dist', '').replace(/\//g, '-').replace('.js', '').replace(/\:/g, '-');
      this.#application.fs.writeFileSync(`query-${id}.sql`, query.sql);
    } else {
      this.#application.fs.writeFileSync(`last-query.sql`, query.sql);
    }
    const result = await this.#driver.query(query.sql, queryModel);
    if (result && result[0]) {
      select = new QueryResult(query.fieldsMap, result[0]);
    }
    return select;
    // } catch(err) {
    //   throw new Error(err.message);
    // }
  }

  async raw(sqlString: string) {
    const result = await this.#driver.query(sqlString);
    return result;
  }
}

function initSchema(
  query: QueryStatement, 
  { application, models }: Pick<QuerySchema, 'application' | 'models'>): QuerySchema {

  return  {
    application,
    fields: new Map,
    additionalFields: new Map,
    from: {},
    joins: {},
    tables: {},
    models,
    sources: new Map(),
    tempSources: [],
    providers: {},
    limit: query.limit,
    offset: query.offset,
  };
}

function buildSQLQuery(application: Application, models: QueryDataSources, query: QueryStatement): { sql: string, fieldsMap: Map<string, FieldDefinition> } {

  const schema = initSchema(query, { application, models });

  const sql = buildSQLStatement(query, schema);

  return { sql, fieldsMap: schema.fields };
}

function buildSQLStatement(query: QueryStatement, schema: QuerySchema, mainSchema?: QuerySchema): string {

  let result: string = '';

  if(query?.with) {
    result = `WITH `;
    Object.entries(query.with).forEach(([alias, subQuery], index) => {
      const withSchema = initSchema(subQuery, schema);
      const withSql = buildSQLStatement(subQuery, withSchema);
  
      const endingToken = index === Object.keys(query.with).length - 1 ? '\n\n' : ',\n';
      result = `${result} ${alias} AS (\n${withSql}\n)${endingToken}`;

      const attributes = {};
      for(let [alias, field] of withSchema.fields) {
        if(alias.endsWith('_p')) {
          continue;
        }

        attributes[field.name] = field.parentModel.definition.attributes[field.name];
      }
  
      schema.models[alias] = {
        tableName: alias,
        definition: {
          id: alias,
          tableId: alias,
          attributes
        },
        name: alias,
        modelName: alias,
        application: schema.application,
        tempTable: true
      }
    });
  }

  defineFrom(query, schema);

  const joins: Map<InnerJoinStatement |
    LeftJoinStatement |
    RightJoinStatement |
    FullJoinStatement, {
      statement: JoinStatement,
      joinType: JoinType,
      model: QueryDataSource,
      provider: QueryDataProvider
    }
  > = new Map();

  if (query.joins?.length) {
    for (let join of query.joins) {
      const { statement, joinType } = getJoinStatement(join);
      const { model, provider } = defineJoinFrom(statement, joinType, schema);
      joins.set(join, { statement, joinType, model, provider });
    }
  }

  defineFields(query, schema);

  defineConditions(query.where, undefined, undefined, schema);

  joins.forEach((value, join) => {
    defineJoinFields(value.statement, value.model, value.provider, schema);
  });

  schema.groupBy = [];
  defineGroupBy(query, schema);

  schema.orderBy = [];
  defineOrderBy(query, schema);
  
  if(query.unionAll) {
    result = `${result}(${buildSQLQueryString(schema)}\n)`;
  } else {
    result = `${result}${buildSQLQueryString(schema)}`;
  }
  
  query.unionAll?.forEach(union => {
    const unionSchema = initSchema(union, schema);
    const unionSQL = buildSQLStatement(union, unionSchema);
    
    result = `${result}\n\nUNION ALL\n\n(${unionSQL}\n)`;
  });
  
    if(query.orderAllBy) {
      result = `${result}\nORDER BY ${query.orderAllBy.join(', ')}`;
    }
  
  return result;
}

function getJoinStatement(join: InnerJoinStatement | LeftJoinStatement | RightJoinStatement | FullJoinStatement): { statement: JoinStatement, joinType: JoinType } {

  const typeMap: Map<string, JoinType> = new Map([
    ['innerJoin', JoinType.INNER],
    ['leftJoin', JoinType.LEFT],
    ['rightJoin', JoinType.RIGHT],
    ['fullJoin', JoinType.FULL],
  ]);

  let statement: JoinStatement;
  let joinType: JoinType;
  for (let key of Object.getOwnPropertyNames(join)) {
    statement = join[key];
    joinType = typeMap.get(key);
    if (!joinType) {
      throw new Error(`Wrong join statement '${key}'`);
    }
  }

  return { statement, joinType };
}

function defineFrom(query: QueryStatement, schema: QuerySchema): void {

  const from = getFrom(query, schema);

  schema.from = {
    name: from.name,
    alias: from.alias,
    tableId: from.model.definition.tableId,
    model: from.model
  }

  schema.from.tempTable = from.model.tempTable;

  schema.tables[from.model.definition.tableId] = from;
  schema.sources.set(from.alias, from);
}

function defineJoinFrom(query: JoinStatement, joinType: JoinType, schema: QuerySchema) {

  const joinFrom = getFrom(query, schema);
  const joinTables = addJoin(joinFrom.model, joinType, schema, query);

  const { leftTable, rigthTable } = joinTables;
  const provider = getProvider(schema, {
    alias: rigthTable.alias,
    params: {
      model: rigthTable.model, position: 'RIGHT',
      participator: leftTable.model, connector: rigthTable.on.fieldId
    }
  });

  for (let joinTableId in joinTables) {
    const joinTable = joinTables[joinTableId];
    if (joinTable.model.modelName !== joinFrom.model.modelName) {
      addSubQueryAttributes(joinFrom.model, joinTable.model);
    }
  }

  return { model: joinFrom.model, provider };
}

function getFrom(query: QueryStatement | JoinStatement, schema: QuerySchema): SourceDefinition {

  let name: string;
  let alias: string;
  let fromModel: QueryDataSource;

  if (typeof query.from === 'string') {
    const statement = getNameAndAlias(query.from);
    name = statement.name;
    alias = statement.alias;
    fromModel = schema.models[name];
    if (!fromModel) {
      throw new QueryError(`Can not find sourse table '${name}', described in 'FROM' clause`);
    }
  } else if (isSubquery((query.from as QueryStatement))) {
    if ((query.from as QueryStatement)?.from instanceof Dataroll
      || (Array.isArray((query.from as QueryStatement)?.from) && (query.from as QueryStatement)?.from[0] instanceof Dataroll)) {
      const from = query.from['from'];
      let childSchema: QuerySchema = {
        application: schema.application,
        fields: new Map,
        additionalFields: new Map,
        from: {},
        joins: {},
        tables: {},
        models: schema.models,
        sources: new Map(),
        providers: {}
      };
      childSchema.mainSchema = schema.mainSchema || schema;
      childSchema.alias = query.from['as'];
      schema.childSchema = childSchema;
      //@ts-ignore
      const sql = buildSQLStatement(query.from, childSchema);
      const dataSource = (from || from[0])[0];
      const tableId = 'temp_' + sid();

      alias = tableId;
      fromModel = {
        tableName: tableId,
        definition: {
          id: alias,
          tableId,
          attributes: defineDataTableAttributes(dataSource)
        },
        name: alias,
        modelName: alias,
        application: schema.application,
        dataSource: dataSource,
        alias: query.from['as'],
        sql
      }
      schema.models[childSchema.alias] = fromModel;
      schema.tables[tableId] = { name: alias, alias: query.from['as'], tableId: tableId };
    } else if (typeof (query.from as QueryStatement)?.from === 'string') {
      const statement = getNameAndAlias((query.from as QueryStatement)?.from as string);
      name = statement.name;
      alias = statement.alias;
      fromModel = schema.models[name];
      if (!fromModel) {
        throw new QueryError(`Can not find sourse table '${name}', described in 'FROM' clause`);
      }

      let childSchema: QuerySchema = {
        application: schema.application,
        fields: new Map,
        additionalFields: new Map,
        from: {},
        joins: {},
        tables: {},
        models: schema.models,
        sources: new Map(),
        providers: {}
      };
      childSchema.mainSchema = schema.mainSchema || schema;
      childSchema.alias = query.from['as'];
      schema.childSchema = childSchema;

      //@ts-ignore
      const sql = buildSQLStatement((query.from as QueryStatement), childSchema);
      fromModel = {
        tableName: fromModel.tableName,
        definition: {
          id: alias,
          tableId: fromModel.tableName,
          attributes: fromModel.definition.attributes
        },
        name: alias,
        modelName: alias,
        application: schema.application,
        alias: query.from['as'],
        sql
      }

      schema.models[childSchema.alias] = fromModel;
      //schema.tables[fromModel.tableName] = { name: alias, alias: query.from['as'], tableId: fromModel.tableName };

    } else {
      throw new Error(`Subquering from subqueries not implemented`);
    }
  } else if (query.from instanceof Dataroll || (Array.isArray(query.from) && query.from[0] instanceof Dataroll)) {
    const tableId = 'temp_' + sid();
    alias = Array.isArray(query.from) && query.from.length > 1 ? query.from[1] : tableId;
    fromModel = {
      tableName: tableId,
      definition: {
        id: alias,
        tableId,
        attributes: defineDataTableAttributes((query.from || query.from[0])[0])
      },
      name: alias,
      modelName: alias,
      application: schema.application,
      dataSource: (query.from || query.from[0])[0]
    }
    schema.models[alias] = fromModel;
    schema.mainSchema = schema.mainSchema || schema;
    schema.mainSchema.tempSources.push(fromModel);
    const tableDefinition = { name: alias, alias, tableId: tableId };
    schema.tables[alias] = tableDefinition;
    schema.tables[tableId] = tableDefinition;
  }

  return getSourceDefinition(fromModel, alias);
}

function getProvider(schema, { alias, params }) {
  if (alias && schema.providers[alias]) {
    return schema.providers[alias];
  }
  const { model, position, participator, connector } = params;
  let provider = Utils.get(schema.providers, `${model.name}.${position}.${participator.name}.${connector}`);
  if (provider) {
    return provider;
  }
  provider = {
    model,
    position,
    participator,
    connector,
    alias: alias || (position === 'LEFT' ? 'l_' : 'r_') + sid()
  };
  schema.providers[model.name] = schema.providers[model.name] || {};
  schema.providers[model.name][position] = schema.providers[model.name][position] || {};
  schema.providers[model.name][position][participator.name] = schema.providers[model.name][position][participator.name] || {};
  schema.providers[model.name][position][participator.name][connector] = provider;
  if (alias) {
    schema.providers[alias] = provider;
  }
  return provider;
}

function defineDataTableAttributes(source: DataTable): QueryDataSourceAttributes {

  const attributes: QueryDataSourceAttributes = {};
  for (let columnDescriptor of source.columns) {
    attributes[columnDescriptor.name] = {
      fieldId: columnDescriptor.name,
      type: {
        dataType: columnDescriptor.dataType,
        length: columnDescriptor.length,
        scale: columnDescriptor.scale
      }
    }
  }

  return attributes;
}

function addSubQueryAttributes(source: QueryDataSource, target: QueryDataSource): void {

  target.definition.joinedAttributes = {};
  for (let attributeName in source.definition.attributes) {
    const attribute = source.definition.attributes[attributeName];
    target.definition.joinedAttributes[attributeName] = {
      fieldId: attribute.fieldId,
      type: {
        dataType: attribute.type.dataType,
        length: attribute.type.length,
        scale: attribute.type.scale
      }
    }
  }

  if (source.definition.codeLenght) {
    target.definition.joinedAttributes['Code'] = {
      fieldId: 'Code',
      type: {
        dataType: source.definition.codeType,
        length: source.definition.codeLenght
      }
    }
  }

  if (source.definition.nameLenght) {
    let fieldId = 'Name';
    if (source.definition.nameLang && source.definition.nameLang.length) {
      fieldId = fieldId + '_' + source.application.lang;
    }
    target.definition.joinedAttributes[fieldId] = {
      fieldId: fieldId,
      type: {
        dataType: 'STRING',
        length: source.definition.nameLenght
      }
    }
  }

  if (source.definition.multilevel) {
    target.definition.joinedAttributes['Parent'] = {
      fieldId: 'parentId',
      type: {
        dataType: 'FK',
        reference: {
          cube: source.definition.cube,
          class: source.definition.class,
          modelId: source.definition.id
        }
      }
    }
  }
}

function getDataTableAttributeType(type: string): 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE' {

  const map = {
    'S': 'STRING',
    'N': 'NUMBER',
    'B': 'BOOLEAN',
    'D': 'DATE'
  }

  return map[type];
}

function isSubquery(query: QueryStatement): boolean {

  let result = false;
  // we just check whether query 'from' property has properties, wich determin it as a Query Statement
  if (query.select && query.from) {
    result = true;
  }

  return result;
}

function defineFields(query: QueryStatement, schema: QuerySchema): void {

  if (!query.select) {
    return;
  }

  const provider = getProvider(schema, {
    alias: schema.from.alias,
    params: {
      model: schema.from.model, position: 'LEFT',
      participator: schema.from.model, connector: 'id'
    }
  });

  if (query.select === '*') {
    return defineAllFields({ provider, schema });
  }

  const selectFields = query.select.split(',');

  for (let fieldStatement of selectFields) {
    fieldStatement = fieldStatement.trim();
    if (fieldStatement) {
      defineField({ statement: fieldStatement, provider, schema });
    }
  }
}

function defineAllFields({ provider, schema }): void {

  const definition = schema.from.model.definition;
  if (definition.class) {
    defineField({ statement: 'Reference', provider, schema });
  }
  if (definition.nameLenght) {
    defineField({ statement: 'Name', provider, schema });
  }
  if (definition.codeLenght) {
    defineField({ statement: 'Code', provider, schema });
  }
  if (definition.multilevel) {
    defineField({ statement: 'Parent', provider, schema });
  }
  for (let attributeName in definition.attributes) {
    defineField({ statement: attributeName, provider, schema });
  }

  if (schema.childSchema) {
    schema.childSchema.fields.forEach(field => {
      const additionalFiels = { ...field }
      //if(!schema.fields.get(field.alias)) {
      additionalFiels.alias = field.alias;
      additionalFiels.fieldId = field.alias;
      additionalFiels.tableId = schema.childSchema.alias;
      schema.additionalFields.set(additionalFiels.alias, additionalFiels);
      //}
    })
  }
}

function defineJoinFields(query: JoinStatement, joinModel: QueryDataSource, provider: QueryDataProvider, schema: QuerySchema): void {

  if (!query.select) {
    return;
  }

  if (query.select === '*') {
    if (joinModel.sql) {
      return defineAllJoinFieldsFromSubQuery(schema.childSchema.fields, schema.childSchema, query);
    } else {
      return defineAllJoinFields(joinModel, provider, schema, query);
    }
  }

  const selectFields = query.select.split(',');

  for (let fieldStatement of selectFields) {
    fieldStatement = fieldStatement.trim();
    if (fieldStatement) {
      if (joinModel.sql) {
        defineJoinFieldFromSubQuery(fieldStatement, schema.childSchema, query);
      } else {
        defineJoinField(fieldStatement, joinModel, provider, schema, query);
      }
    }
  }
}

function defineGroupBy(query: QueryStatement, schema: QuerySchema): void {

  if (query.groupBy && Array.isArray(query.groupBy)) {
    let model: QueryDataSource | SourceDefinition = schema.from.model;
    let tableAlias: string;
    for (let fieldId of query.groupBy) {
      if (fieldId.includes('.')) {
        const parts = fieldId.split('.');
        const modelAlias = parts[0];
        model = schema.models[modelAlias] || schema.sources.get(modelAlias);
        fieldId = parts[1];
      }

      if (!(model as QueryDataSource).dataSource) {
        const lang = (model as SourceDefinition).model.application.lang;
        let modelDefinition = (model as SourceDefinition).model.definition;
        const fieldDefinition = schema.fields.get(fieldId.toLocaleLowerCase());
        const tableId = fieldDefinition.tableId;
        const tableDefinition = schema.tables[tableId];
        if (fieldDefinition.tableId !== modelDefinition.tableId) {
          modelDefinition = fieldDefinition.model.definition;
        }
        tableAlias = tableDefinition.alias;
        let fieldName = fieldDefinition.name;
        if (fieldName === 'Name') {
          if (modelDefinition.nameLang && modelDefinition.nameLang.length) {
            fieldId = fieldId + '_' + lang;
          }
        } else if (fieldName === 'id') {
          fieldId = 'id';
        } else if (fieldName === 'Reference') {
          fieldId = 'id';
        } else if (fieldName === 'Code') {

        } else if (fieldName === 'Parent') {
          fieldId = 'parentId';
        } else if (fieldName === 'Owner') {
          fieldId = 'ownerId';
        } else if (fieldName === 'order') {
          fieldId = 'order';
        } else {
          const attribute = modelDefinition.attributes[fieldName];
          if (!attribute) {
            throw new QueryError(`Can not find attribute '${fieldName}' in ${model.name}`);
          } else {
            if (attribute.type.lang && attribute.type.lang.length) {
              fieldId = attribute.fieldId + '_' + lang;
            } else {
              fieldId = attribute.fieldId;
            }
          }
        }
      }



      if (model.alias) {
        schema.groupBy.push(`${tableAlias || model.alias}."${fieldId}"`);
      } else {
        schema.groupBy.push(`${(model as QueryDataSource).modelName}.${fieldId}`);
      }
    }
  }
}
function defineOrderBy(query: QueryStatement, schema: QuerySchema): void {

  if (query.orderBy && Array.isArray(query.orderBy)) {
    const model = schema.from.model;
    for (let input of query.orderBy) {
      const parts = input.split(' ');
      let fieldId = parts[0];
      let fieldName = fieldId;
      let direction = 'ASC';
      if (parts.length > 1) {
        direction = parts[1];
        if (!'ASC|DESC'.includes(direction.toUpperCase())) {
          throw new Error(`Token ${direction} can't be used in ORDER BY statement`);
        }
      }
      if (fieldId.includes('.')) {

      } else {
        const lang = model.application.lang;
        const modelDefinition = model.definition;
        if (fieldName === 'Name') {
          if (modelDefinition.nameLang && modelDefinition.nameLang.length) {
            fieldId = fieldId + '_' + lang;
          }
        } else if (fieldName === 'id') {
          fieldId = 'id';
        } else if (fieldName === 'Reference') {
          fieldId = 'id';
        } else if (fieldName === 'Code') {
        } else if (fieldName === 'Date') {
        } else if (fieldName === 'Order') {
          fieldId = 'order';
        } else if (fieldName === 'Parent') {
          fieldId = 'parentId';
        } else if (fieldName === 'Owner') {
          fieldId = 'ownerId';
        } else if (fieldName === 'order') {
          fieldId = 'order';
        } else {
          const attribute = modelDefinition.attributes[fieldName];
          if (!attribute) {
            throw new QueryError(`Can not find attribute '${fieldName}' in ${model.name}`);
          }
          if (attribute.type.lang && attribute.type.lang.length) {
            fieldId = attribute.fieldId + '_' + lang;
          } else {
            fieldId = attribute.fieldId;
          }

          if(schema.from.tempTable) {
            fieldId = fieldName;
          }
        }
      }

      if(schema.from.tempTable) {
        schema.orderBy.push(`${schema.from.alias}.${fieldId} ${direction}`); 
      } else {
        schema.orderBy.push(`${schema.from.alias}."${fieldId}" ${direction}`);
      }
    }
  }
}

interface DefineField {
  statement: string,
  provider: QueryDataProvider,
  schema: QuerySchema
}
function defineField({ statement, provider, schema }): void {

  let { name, alias } = getNameAndAlias(statement);
  let func;

  const agreegateFunctionsPattern = /(MAX|MIN|AVG|SUM|COUNT)\((.*)\)/;
  let match = agreegateFunctionsPattern.exec(name);
  if (match) {
    func = match[1];
    name = match[2];
    alias = alias || name.replace(/\./g, '');
  }

  if (name.includes('.')) {
    determineReferenceJoins(name, alias, schema.from.model, schema, func);
  } else {
    try {
      addFieldDefinition({ name, alias, provider, model: schema.from.model, schema, func });
      
    } catch (error) {
      throw console.log(error);
    }
  }

  if(name === 'Reference') {
    addFieldDefinition({ name: 'Name', alias: 'Reference_p', provider, model: schema.from.model, schema, func });
  }
}

function defineJoinField(fieldStatement: string, joinModel: QueryDataSource, provider: QueryDataProvider, schema: QuerySchema, query: JoinStatement): void {

  let { name, alias } = getNameAndAlias(fieldStatement);
  let func;

  const agreegateFunctionsPattern = /(MAX|MIN|AVG|SUM|COUNT)\((.*)\)/;
  let match = agreegateFunctionsPattern.exec(name);
  if (match) {
    func = match[1];
    name = match[2];
    alias = alias || name.replace(/\./g, '');
  }

  if (name.includes('.')) {
    determineJoins(name, alias, provider, schema, query);
  } else {
    addFieldDefinition({ name, alias, provider, model: joinModel, schema, func });
  }
}

function defineJoinFieldFromSubQuery(fieldStatement: string, schema: QuerySchema, query: JoinStatement): void {

  let { name, alias } = getNameAndAlias(fieldStatement);
  let func;

  const agreegateFunctionsPattern = /(MAX|MIN|AVG|SUM|COUNT)\((.*)\)/;
  let match = agreegateFunctionsPattern.exec(name);
  if (match) {
    func = match[1];
    name = match[2];
    alias = alias || name.replace(/\./g, '');
  }

  if (name.includes('.')) {
    throw new Error(`Nested atributes selecting from subqueries not implemented`);
  } else {
    const fieldDefinition = schema.fields.get(name.toLocaleLowerCase());
    if (fieldDefinition) {
      addFieldDefinitionFromSubQuery(fieldDefinition, schema, func);
    } else {
      throw new Error(`Can't find field definition for '${name}' field`);
    }
  }
}

function defineAllJoinFields(joinModel: QueryDataSource, provider: QueryDataProvider, schema: QuerySchema, query: JoinStatement): void {

  const definition = joinModel.definition;
  if (definition.nameLenght) {
    addFieldDefinition({ name: 'Name', alias: 'Name', provider, model: joinModel, schema });
  }
  if (definition.codeLenght) {
    addFieldDefinition({ name: 'Code', alias: 'Code', provider, model: joinModel, schema });
  }
  if (definition.multilevel) {
    addFieldDefinition({ name: 'Parent', alias: 'Parent', provider, model: joinModel, schema });
  }
  for (let attributeName in definition.attributes) {
    addFieldDefinition({ name: attributeName, alias: attributeName, provider, model: joinModel, schema });
  }
}

interface DefineAllJoinFields {
  fields: Map<string, FieldDefinition>,
  schema: QuerySchema,
  query: JoinStatement
}
function defineAllJoinFieldsFromSubQuery(fields: Map<string, FieldDefinition>, schema: QuerySchema, query: JoinStatement): void {

  for (let [_, fieldDefinition] of fields.entries()) {
    addFieldDefinitionFromSubQuery(fieldDefinition, schema);
  }
}

interface AddFieldDefinition {
  name: string,
  alias: string,
  provider: QueryDataProvider,
  model: QueryDataSource,
  schema: QuerySchema,
  func?: string,
  noRef?: boolean
}

function addFieldDefinition({ name, alias, provider, model, schema, func, noRef }: AddFieldDefinition): void {

  alias = alias || name;

  let fieldId = name;
  let dataType: ApplicationDataType;
  let length: number;
  let scale: number;

  const lang = model.application.lang;
  const modelDefinition = model.definition;
  let referenceModelId = modelDefinition.id;
  if (name === 'Name') {
    if (modelDefinition.nameLang && modelDefinition.nameLang.length) {
      fieldId = fieldId + '_' + lang;
    }
    dataType = 'STRING';
  } else if (name === 'id') {
    fieldId = 'id';
    dataType = 'STRING';
  } else if (name === 'Reference') {
    fieldId = 'id';
    dataType = 'FK';
  } else if (name === 'Code') {
    dataType = modelDefinition.codeType;
  } else if (name === 'Date') {
    dataType = 'DATE';
  } else if (name === 'Parent') {
    fieldId = 'parentId';
    dataType = 'FK';
  } else if (name === 'Owner') {
    fieldId = 'ownerId';
    dataType = 'FK';
    referenceModelId = modelDefinition.owners[0];
  } else if (name === 'order') {
    fieldId = 'order';
    dataType = 'NUMBER';
  } else if (name === 'Registrator') {
    fieldId = 'ownerId';
    dataType = 'FK';
    referenceModelId = modelDefinition.owners[0];
  } else if (name === 'Updated') {
    fieldId = 'updatedAt';
    dataType = 'DATE';
  } else {
    const attribute = modelDefinition.attributes[name];
    if (!attribute) {
      throw new QueryError(`Can not find attribute '${name}' in ${model.name}`);
    }
    if (attribute.type.lang && attribute.type.lang.length) {
      fieldId = attribute.fieldId + '_' + lang;
    } else {
      fieldId = attribute.fieldId;
      if (attribute.type.dataType === 'FK') {
        if (!schema.isConditionSubQuery && !noRef) {
          // to add reference join for getting presentation (name currently)
          referenceModelId = attribute.type.reference.modelId;
          determineReferenceJoins(`${name}.Name`, `${alias}_p`, model, schema);
        } else {
          dataType = 'STRING';
        }
      }
    }
    dataType = attribute.type.dataType;
    length = attribute.type.length;
    scale = attribute.type.scale;

  }

  const fieldDefinition = {
    name,
    alias,
    tableId: modelDefinition.tableId,
    provider,
    model: schema.models[referenceModelId],
    parentModel: model,
    fieldId,
    dataType,
    length,
    scale,
    func
  }

  const existingField = schema.fields.get(alias.toLocaleLowerCase());
  if (existingField && existingField.tableId !== fieldDefinition.tableId) {
    throw new Error(`Field alias duplicate: '${alias}' defined in ${existingField.provider.alias} and ${fieldDefinition.provider.alias}`);
  }

  schema.fields.set(alias.toLocaleLowerCase(), fieldDefinition);
}

function addFieldDefinitionFromSubQuery(field: FieldDefinition, schema: QuerySchema, func?: string): void {

  const alias = field.alias;
  const fieldDefinition = {
    name: alias,
    alias: alias,
    tableId: schema.alias,
    model: undefined,
    parentModel: undefined,
    fieldId: alias,
    dataType: undefined,
    length: undefined,
    scale: undefined,
    func: func,
  }

  schema.mainSchema.fields.set(alias.toLocaleLowerCase(), fieldDefinition);
}

function getNameAndAlias(sourceStatement: string): { name: string, alias: string } {

  const statement = sourceStatement.replace(' as ', ' AS ').split(' AS ');
  let name: string = statement[0];
  let alias: string;
  if (statement.length > 1) {
    alias = statement[1];
  }

  return { name, alias };
}

function determineReferenceJoins(fieldName: string, alias: string, model: QueryDataSource, schema: QuerySchema, func?: string): void {

  const track = fieldName.split('.');
  // if(track.length && track[1] === 'id') {
  //   alias = alias || track.join(); 
  //   const provider = getProvider(schema, {
  //     alias: undefined,
  //     params: { model,
  //         position: 'RIGHT',
  //         participator: model,
  //         connector: 'id' }
  //   });
  //   return  addFieldDefinition({ name: track[0], alias, provider, model, schema, func, noRef: true });
  // }

  let mainModel = model;
  let parentField;
  let participator;
  let result;
  for (let i = 0; i < track.length - 1; i++) {
    const attributeName = track[i];
    participator = mainModel;
    result = addReferenceJoin(attributeName, fieldName, mainModel, schema, i + 1, track.length, parentField);
    mainModel = result.mainModel;
    parentField = result.parentField;
  }
  const { leftTable, rigthTable } = result;
  const provider = getProvider(schema, {
    alias: rigthTable.alias,
    params: {
      model: mainModel,
      position: 'RIGHT',
      participator,
      connector: 'id'
    }
  });

  const attributeName = track[track.length - 1];
  addFieldDefinition({ name: attributeName, alias, provider, model: mainModel, schema });
}

function determineJoins(fieldName: string, alias: string, provider: QueryDataProvider, schema: QuerySchema, query: JoinStatement): void {

  const track = fieldName.split('.');
  const joinFrom = getFrom(query, schema);
  let mainModel = joinFrom.model;
  let parentField: FieldDefinition;
  let result;
  for (let i = 0; i < track.length - 1; i++) {
    const attributeName = track[i];
    result = addReferenceJoin(attributeName, fieldName, mainModel, schema, i + 1, track.length, parentField);
    mainModel = result.mainModel;
    parentField = result.parentField;
  }

  const { leftTable, rigthTable } = result;
  const _provider = getProvider(schema, {
    alias: rigthTable.alias,
    params: {
      model: rigthTable.model, position: 'RIGHT',
      participator: leftTable.model, connector: rigthTable.on.fieldId
    }
  });
  const attributeName = track[track.length - 1];
  addFieldDefinition({ name: attributeName, alias, provider: _provider, model: mainModel, schema });
}

function addReferenceJoin(
  attributeName: string,
  fieldName: string,
  mainModel: QueryDataSource,
  schema: QuerySchema,
  level: number,
  trackLength: number,
  parentField?: FieldDefinition
) {

  const modelDefinition = mainModel.definition;
  let attribute: QueryDataSourceAttribute;
  let referenceModelId: string;
  let referenceModel: QueryDataSource;

  const lang = mainModel.application.lang;

  if (attributeName === 'Name') {
    let fieldId = 'Name';
    if (modelDefinition.nameLang && modelDefinition.nameLang.length) {
      fieldId = fieldId + '_' + lang;
    }
    attribute = {
      fieldId: fieldId,
      type: {
        dataType: 'STRING'
      }
    }
  } else if (attributeName === 'Reference') {
    referenceModelId = modelDefinition.id;
    attribute = {
      fieldId: 'id',
      type: {
        dataType: 'FK',
        reference: {
          modelId: referenceModelId
        }
      }
    }
  } else if (attributeName === 'id') {
    referenceModelId = modelDefinition.id;
    attribute = {
      fieldId: 'id',
      type: {
        dataType: 'FK',
        reference: {
          modelId: referenceModelId
        }
      }
    }
  } else if (attributeName === 'Code') {
    referenceModelId = modelDefinition.id;
    attribute = {
      fieldId: 'Code',
      type: {
        dataType: 'STRING',
        reference: {
          modelId: referenceModelId
        }
      }
    }
  } else if (attributeName === 'Owner') {
    referenceModelId = modelDefinition.owners[0];
    attribute = {
      fieldId: 'ownerId',
      type: {
        dataType: 'FK',
        reference: {
          modelId: referenceModelId
        }
      }
    }
  } else if (attributeName === 'order') {
    referenceModelId = modelDefinition.id;
    attribute = {
      fieldId: 'order',
      type: {
        dataType: 'NUMBER',
        reference: {
          modelId: referenceModelId
        }
      }
    }

  } else if (attributeName === 'Parent') {
    referenceModelId = modelDefinition.id;
    attribute = {
      fieldId: 'parentId',
      type: {
        dataType: 'FK',
        reference: {
          modelId: referenceModelId
        }
      }
    }

  } else {
    attribute = modelDefinition.attributes[attributeName];
    if (!attribute) {
      throw new QueryError(`Can not find attribute '${attributeName}' in ${mainModel.name}`);
    }

    if (level < trackLength && attribute.type.dataType !== 'FK') {
      throw new QueryError(`Attribute '${attributeName}' in reference field '${fieldName}' is not a reference. It is a type of '${attribute.type.dataType}'`);
    }

    referenceModelId = attribute.type.reference.modelId;
  }

  referenceModel = ((schema.models[referenceModelId] as unknown) as QueryDataSource);
  if (!referenceModel) {
    throw new QueryError(`Can not find sourse table with ID '${referenceModelId}' as reference table, described id fielad '${fieldName}'`);
  }

  let leftTableAlias = 'l_' + sid();
  let leftTableDefinition = schema.tables[mainModel.definition.tableId];
  if (leftTableDefinition) {
    leftTableAlias = leftTableDefinition.alias;
  }
  let rigthTableAlias = 'r_' + sid();
  let rigthTableDefinition = schema.tables[referenceModel.definition.tableId];
  if (rigthTableDefinition) {
    rigthTableAlias = rigthTableDefinition.alias;
  }

  const leftTable = (getSourceDefinition(mainModel, leftTableAlias) as TableDefinition & { on: FieldDefinition });
  const rigthTable = (getSourceDefinition(referenceModel, rigthTableAlias) as TableDefinition & { on: FieldDefinition });

  const leftTableReferenceField = {
    name: attributeName,
    alias: parentField ? parentField.alias + attributeName : attributeName,
    tableId: mainModel.definition.tableId,
    model: schema.models[attribute.type.reference.modelId],
    parentModel: schema.models[attribute.type.reference.modelId],
    fieldId: attribute.fieldId,
    dataType: attribute.type.dataType
  }

  if (level === trackLength) {
    schema.fields.set(leftTableReferenceField.alias.toLocaleLowerCase(), leftTableReferenceField);
  }

  const rigthTableReferenceField = {
    name: 'id',
    tableId: referenceModel.definition.tableId,
    model: referenceModel,
    parentModel: referenceModel,
    fieldId: 'id',
    dataType: 'FK' as ApplicationDataType
  }

  leftTable.on = leftTableReferenceField;
  rigthTable.on = rigthTableReferenceField;

  const existingSource = schema.sources.get(rigthTable.alias);
  if (existingSource) {
    for (let joinKey in schema.joins) {
      const joinTable = schema.joins[joinKey];
      for (let join of joinTable) {
        if (join.leftTable.alias === rigthTableAlias && join.rigthTable.alias !== leftTableAlias) {
          rigthTableAlias = 'r_' + sid();
          rigthTable.alias = rigthTableAlias;
        }
        else if (join.rigthTable.alias === leftTableAlias && join.leftTable.alias !== rigthTableAlias) {
          // leftTableAlias = 'l_' + sid();
          // leftTable.alias = leftTableAlias;
        }
      }
    }
  }

  if (!schema.joins[mainModel.modelName]) {
    schema.joins[mainModel.modelName] = [];
  }

  if (!(leftTableDefinition && rigthTableDefinition)) {
    // add join to schema only if it is uniq
    schema.joins[mainModel.modelName].push({
      joinType: JoinType.LEFT,
      leftTable,
      rigthTable
    });
  }

  schema.tables[leftTable.tableId] = leftTable;
  schema.tables[rigthTable.tableId] = rigthTable;

  schema.sources.set(leftTable.alias, leftTable);
  schema.sources.set(rigthTable.alias, rigthTable);

  return { mainModel: referenceModel, parentField: leftTableReferenceField, leftTable, rigthTable };
}

function getAttributeDefinition(attributeName: string, model: QueryDataSource, schema: QuerySchema): { dataType: ApplicationDataType, fieldId: string, referenceModel?: QueryDataSource, } {

  const modelDefinition = model.definition;
  let attribute: ModelAttributeDefinition;
  let referenceModelId: string;
  let referenceModel: QueryDataSource;

  const lang = model.application.lang;

  if (attributeName === 'Name') {
    let fieldId = 'Name';
    if (modelDefinition.nameLang && modelDefinition.nameLang.length) {
      fieldId = fieldId + '_' + lang;
    }
    attribute = {
      fieldId: fieldId,
      type: {
        dataType: 'STRING'
      }
    }
  } else if (attributeName === 'id') {
    referenceModelId = modelDefinition.id;
    attribute = {
      fieldId: 'id',
      type: {
        dataType: 'FK',
        reference: {
          modelId: referenceModelId
        }
      }
    }
  } else if (attributeName === 'Code') {
    referenceModelId = modelDefinition.id;
    attribute = {
      fieldId: 'Code',
      type: {
        dataType: 'STRING',
        reference: {
          modelId: referenceModelId
        }
      }
    }
  } else if (attributeName === 'Reference') {
    referenceModelId = modelDefinition.id;
    attribute = {
      fieldId: 'id',
      type: {
        dataType: 'FK',
        reference: {
          modelId: referenceModelId
        }
      }
    }

  } else if (attributeName === 'Owner') {
    referenceModelId = modelDefinition.owners[0];
    attribute = {
      fieldId: 'ownerId',
      type: {
        dataType: 'FK',
        reference: {
          modelId: referenceModelId
        }
      }
    }

  } else if (attributeName === 'Registrator') {
    referenceModelId = modelDefinition.ownerModel.definition.id;
    attribute = {
      fieldId: 'ownerId',
      type: {
        dataType: 'FK',
        reference: {
          modelId: referenceModelId
        }
      }
    }
  } else if (attributeName === 'Parent') {
    referenceModelId = modelDefinition.id;
    attribute = {
      fieldId: 'parentId',
      type: {
        dataType: 'FK',
        reference: {
          modelId: referenceModelId
        }
      }
    }

  } else if (attributeName === 'Updated') {
    referenceModelId = modelDefinition.id;
    attribute = {
      fieldId: 'updatedAt',
      type: {
        dataType: 'DATE',
        reference: {
          modelId: referenceModelId
        }
      }
    }
  } else if (attributeName === 'order') {
    referenceModelId = modelDefinition.id;
    attribute = {
      fieldId: 'order',
      type: {
        dataType: 'NUMBER',
        reference: {
          modelId: referenceModelId
        }
      }
    }
  } else {
    attribute = modelDefinition.attributes[attributeName];
    if (!attribute) {
      throw new QueryError(`Can not find attribute '${attributeName}' in ${model.name}`);
    }

    if (attribute.type.dataType === 'FK') {
      referenceModelId = attribute.type.reference.modelId;
      referenceModel = ((schema.models[referenceModelId] as unknown) as QueryDataSource);
      if (!referenceModel) {
        throw new QueryError(`Can not find sourse table with ID '${referenceModelId}' as reference table, described id field '${attributeName}'`);
      }
    }
  }

  return { dataType: attribute.type.dataType, fieldId: attribute.fieldId, referenceModel };
}

function addJoin(
  rigthModel: QueryDataSource,
  joinType: JoinType,
  schema: QuerySchema,
  query: JoinStatement
): { leftTable, rigthTable } {

  const onLeftTrack = query.on[0].split('.');
  const leftModelAlias = onLeftTrack[0];

  const onRigthTrack = query.on[1].split('.');
  const rigthModelAlias = onRigthTrack[0];
  const onRigthFieldName = onRigthTrack[1];

  const leftSource = { ...schema.sources.get(leftModelAlias) };
  const leftModel = leftSource.model;
  if (!leftModel) {
    throw new QueryError(`Can not find sourse table with alias '${leftModelAlias}' as reference table`);
  }

  const leftTable = (leftSource as TableDefinition & { on: FieldDefinition });
  let rigthTable;
  if (rigthModel.sql) {
    const model = schema.models[rigthModelAlias];
    rigthTable = (getSourceDefinition(model, rigthModelAlias) as TableDefinition & { on: FieldDefinition });
  } else {
    rigthTable = (getSourceDefinition(rigthModel, rigthModelAlias) as TableDefinition & { on: FieldDefinition });
  }

  const onLeftFieldName = onLeftTrack[1];
  const leftOnField = getAttributeDefinition(onLeftFieldName, leftModel, schema);
  const leftTableReferenceField = {
    name: onLeftFieldName,
    tableId: leftModel.definition.tableId,
    model: leftOnField.referenceModel,
    parentModel: leftOnField.referenceModel,
    fieldId: leftOnField.fieldId,
    dataType: leftOnField.dataType
  }

  let rigthOnField;
  let tableId;
  if (rigthModel.sql) {
    rigthOnField = schema.childSchema.fields.get(onRigthFieldName.toLocaleLowerCase());
    tableId = schema.childSchema.alias;
    rigthTable.tableId = tableId;
  } else {
    rigthOnField = getAttributeDefinition(onRigthFieldName, rigthModel, schema);
    tableId = rigthModel.definition.tableId;
  }
  const rigthTableReferenceField = {
    name: onRigthFieldName,
    tableId: tableId,
    model: rigthOnField.referenceModel,
    parentModel: rigthOnField.referenceModel,
    fieldId: rigthOnField.fieldId,
    dataType: rigthOnField.dataType
  }

  leftTable.on = leftTableReferenceField;
  rigthTable.on = rigthTableReferenceField;

  if (!schema.joins[leftModel.modelName]) {
    schema.joins[leftModel.modelName] = [];
  }
  schema.joins[leftModel.modelName].push({
    joinType,
    leftTable,
    rigthTable
  });

  schema.tables[leftTable.tableId] = leftTable;
  schema.tables[rigthTable.tableId] = rigthTable;

  schema.sources.set(rigthTable.alias, rigthTable);

  return { leftTable, rigthTable };
}

function getSourceDefinition(model: QueryDataSource, alias?: string): SourceDefinition {

  return {
    name: model.modelName,
    alias: alias || model.modelName.replace(/\./g, ''),
    tableId: model.tableName,
    model: model
  };
}

function buildSQLQueryString(schema: QuerySchema): string {

  let result = '';

  if (schema.tempSources) {
    for (let source of schema.tempSources) {
      const attributes = source.definition.attributes;
      const columns = describeColumns(attributes);
      const tableId = source.definition.tableId;
      result += `CREATE TEMP TABLE ${tableId} (${columns.join(', ')});\n`;
      const insertions = defineInsertions(attributes, source.dataSource);
      if (insertions.length) {
        result += `INSERT INTO ${tableId} VALUES ${insertions.join(', ')};\n`;
      }
    }
  }

  let fields = [];

  function wrapIfFunc(input: string, func: string | undefined, cast?: string): string {
    let result = input;
    if (func) {
      result = `${func}(${input}${cast || ''})`;
    }
    return result;
  }

  schema.fields.forEach((fieldDefinition) => {
    const tableId = fieldDefinition.tableId;
    const tableDefinition = schema.tables[tableId];
    // const tableAlias = tableDefinition.alias;
    const tableAlias = fieldDefinition.provider.alias;
    if(fieldDefinition.model && fieldDefinition.model.tempTable || fieldDefinition.provider.model.tempTable) {
      fields.push(`${wrapIfFunc(`${tableAlias}.${fieldDefinition.alias}`, fieldDefinition.func)}`);
    } else if ((fieldDefinition.model && fieldDefinition.model.dataSource) || !fieldDefinition.model) {
      fields.push(`${wrapIfFunc(`${tableAlias}.${fieldDefinition.fieldId}`, fieldDefinition.func)} AS ${fieldDefinition.alias}`);
    } else {
      let cast = '';
      if (fieldDefinition.dataType === 'FK') {
        cast = '::varchar';
      }
      fields.push(`${wrapIfFunc(`${tableAlias}."${fieldDefinition.fieldId}"`, fieldDefinition.func, cast)} AS ${fieldDefinition.alias}`);
    }
  })

  schema.additionalFields.forEach((fieldDefinition) => {
    if (!schema.fields.get(fieldDefinition.alias.toLocaleLowerCase())) {
      const tableId = fieldDefinition.tableId;
      const tableDefinition = schema.tables[tableId];
      const tableAlias = tableDefinition.alias;
      fields.push(`${tableAlias}.${fieldDefinition.fieldId} AS ${fieldDefinition.alias}`);
      schema.fields.set(fieldDefinition.alias.toLocaleLowerCase(), fieldDefinition);
    }
  })

  result = result + `SELECT\n\t${fields.join(',\n\t')} `;
  if (schema.from.model.dataSource) {
    result += `\nFROM ${schema.from.tableId} ${schema.from.alias} `;// if table created dynamically we don't need brackets
  } else if (schema.from.model.sql) {
    result += `\nFROM "(${schema.from.model.sql})" ${schema.from.alias} `;
  } else if (schema.from.model.tempTable) {
    result += `\nFROM ${schema.from.tableId}`;
  } else {
    result += `\nFROM "${schema.from.tableId}" ${schema.from.alias} `;
  }

  for (let key in schema.joins) {
    const joins = schema.joins[key];
    for (let join of joins) {
      if (join.rigthTable.model.sql) {
        result += `${join.joinType} (${join.rigthTable.model.sql}) ${join.rigthTable.alias} `;
      } else if (join.rigthTable.model.dataSource) {
        result += `\n\t${join.joinType} ${join.rigthTable.tableId} ${join.rigthTable.alias} `;
      } else {
        result += `\n\t${join.joinType} "${join.rigthTable.tableId}" ${join.rigthTable.alias} `;
      }

      let leftCast = '';
      let rigthCast = '';
      let quoteL = '"';
      let quoteR = '"';
      if ((join.leftTable.on.dataType === 'FK' || join.leftTable.on.dataType === 'ENUM') && join.rigthTable.on.dataType !== 'FK' && join.rigthTable.on.dataType !== 'ENUM') {
        leftCast = '::"varchar"';
      } else if ((join.rigthTable.on.dataType === 'FK' || join.rigthTable.on.dataType === 'ENUM') && join.leftTable.on.dataType !== 'FK' && join.leftTable.on.dataType !== 'ENUM') {
        rigthCast = '::"varchar"';
      }
      if (join.leftTable.model.dataSource || join.leftTable.model.tempTable) {
        quoteL = '';
      }
      if (join.rigthTable.model.dataSource || join.rigthTable.model.tempTable) {
        quoteR = '';
      }
      let leftTableOnFieldId = join.leftTable.on.fieldId;
      if (join.leftTable.model.sql || join.leftTable.model.tempTable) {
        leftTableOnFieldId = join.leftTable.on.name;
      }
      let rigthTableOnFieldId = join.rigthTable.on.fieldId;
      if (join.rigthTable.model.sql || join.rigthTable.model.tempTable) {
        rigthTableOnFieldId = join.rigthTable.on.name;
      }
      result += `\n\t\tON ${join.leftTable.alias}.${quoteL + leftTableOnFieldId + quoteL + leftCast} = ${join.rigthTable.alias}.${quoteR + rigthTableOnFieldId + quoteR + rigthCast} `
    }
  }

  if (schema.where) {
    result += `\nWHERE ${buildWhereClause(schema)}`;
  }

  if (schema.groupBy?.length) {
    result += `\nGROUP BY ${schema.groupBy.join(', ')}`;
  }

  if (schema.orderBy?.length) {
    result += `\nORDER BY ${schema.orderBy.join(', ')}`;
  }

  if (schema.limit) {
    result += `\nLIMIT ${schema.limit}`;
  }

  if (schema.offset) {
    result += `\nOFFSET ${schema.offset}`;
  }

  return result;
}

function describeColumns(attributes): string[] {

  const columns = [];
  for (let attributeName in attributes) {
    const field = attributes[attributeName];
    columns.push(describeColumn(field as QueryDataSourceAttribute));
  }

  return columns;
}

function describeColumn(field: QueryDataSourceAttribute) {
  let definition;
  const type = describeType(field);
  definition = `${field.fieldId} ${type}`;

  return definition;
}

function describeType(field: QueryDataSourceAttribute) {
  switch (field.type.dataType) {
    case 'STRING':
      return `VARCHAR(${field.type.length || 255})`;
    case 'NUMBER':
      return `NUMERIC(${field.type.length || 10},${field.type.scale})`;
    case 'BOOLEAN':
      return `BOOLEAN`;
    case 'DATE':
      return `TIMESTAMP`;
  }
}

function defineInsertions(fields, source: DataTable) {

  const insertions = [];
  for (let entry of source) {
    const values = defineValues(fields, entry);
    insertions.push(`(${values.join(', ')})`);
  };

  return insertions;
}

function defineValues(fields, entry) {

  const values = [];
  for (let fieldName in fields) {
    const field = fields[fieldName];
    const value = adoptValue(Utils.get(entry, field.fieldId), field.type.dataType);
    switch (field.type.dataType) {
      case 'STRING':
        values.push(`'${value || ''}'`);
        break;
      case 'DATE':
        values.push(`'${(value || new Date(1, 1, 1, 0, 0, 0, 0)).toISOString()}'`);
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
      if (isNaN(value)) {
        value = 'NULL';
      }
      return value;
    case 'BOOLEAN':
      return Boolean(value);
    case 'DATE':
      return value || new Date(1, 1, 1, 0, 0, 0, 0);
  }
}

function buildWhereClause(schema: QuerySchema): string {

  let result: string[] = [];

  const conditions: BooleanConditionDefinition | ConditionDefinition[] = (schema.where as BooleanConditionDefinition).conditions;
  for (let index in conditions) {
    const condition = conditions[index];
    condition.schema = schema;
    result.push(buildOperation(condition));
  }

  return result.join(` ${(schema.where as BooleanConditionDefinition).type} `);
}

const operationBuilders = {
  '=': buildOperationComparison,
  '>': buildOperationComparison,
  '<': buildOperationComparison,
  '>=': buildOperationComparison,
  '<=': buildOperationComparison,
  '<>': buildOperationComparison,
  'BETWEEN': buildOperationBetween,
  'LIKE': buildOperationComparison,
  'ILIKE': buildOperationComparison,
  'IN': buildOperationIn,
  'IS NULL': buildOperationIsNull,
  'IS NOT NULL': buildOperationIsNotNull,
  'IS TRUE': buildOperationBoolean,
  'IS FALSE': buildOperationBoolean
}

function getComperisonValue(condition: ConditionDefinition): string {

  let result: string;

  let value = condition.etalon.value;

  if (condition.etalon.isSubQuery) {
    result = `(${buildSQLQueryString(value)})`;
  } else if (condition.etalon.value[0].select) {
    const subQuery = condition.etalon.value[0];
    const subSchema = initSchema(subQuery, condition.schema);
    subSchema.isConditionSubQuery = true;
    const withSql = buildSQLStatement(subQuery, subSchema);
    result = `(${withSql})`;
  } else {
    value = condition.etalon.value[0];
    result = `${value}`;
    if (condition.field.dataType === 'FK') {
      if (Array.isArray(value)) {
        result = getComperisonValueFromCollection(value);
      } else {
        result = `'${value.id}'`;
      }
    } else {
      if (typeof value === 'string') {
        result = `'${value}'`;
      } else if (Utils.isDate(value)) {
        result = `'${value.toISOString()}'`;
      } else if (Array.isArray(value)) {
        let values: string[] = [];
        for (let val of value) {
          values.push(`'${val}'`);
        }
        result = values.join(", ");
      }
    }
  }

  return result;
}

function getComperisonValueFromCollection(values: { id: string }[]): string {

  let result: string[] = [];
  for (let value of values) {
    result.push(`'${value.id}'`);
  }

  return result.join(", ");
}

function buildOperationComparison(condition: ConditionDefinition): string {

  let result = `${condition.field.tableAlias}."${condition.field.fieldId}" ${condition.operation} ${getComperisonValue(condition)}`;

  return result;
}

function buildOperationBetween(condition: ConditionDefinition): string {

  let result = `${condition.field.tableAlias}."${condition.field.fieldId}" ${condition.operation} ${condition.etalon.value[0]}\n\tAND ${condition.etalon.value[1]})`;

  return result;
}

function buildOperationBoolean(condition: ConditionDefinition): string {

  let result = `${condition.field.tableAlias}."${condition.field.fieldId}" ${condition.operation}`;

  return result;
}

function buildOperationIn(condition: ConditionDefinition): string {

  let result = `${condition.field.tableAlias}."${condition.field.fieldId}" ${condition.operation} (${getComperisonValue(condition)})`;

  return result;
}

function buildOperationIsNull(condition: ConditionDefinition): string {

  let result = `${condition.field.tableAlias}."${condition.field.fieldId}" IS NULL`;

  return result;
}

function buildOperationIsNotNull(condition: ConditionDefinition): string {

  let result = `${condition.field.tableAlias}."${condition.field.fieldId}" IS NOT NULL`;

  return result;
}

function buildOperation(condition: BooleanConditionDefinition | ConditionDefinition): string {

  let result: string[] = [];

  if (condition['type']) { // Bitwise condition
    if (condition['type'].type) { // Bitwise subcondition
      result.push(buildOperation(condition));
    } else {
      const subConditions = (condition as BooleanConditionDefinition).conditions as ConditionDefinition[];
      for (let subCondition of subConditions) {
        const operationBuilder = operationBuilders[subCondition.operation];
        result.push(operationBuilder(subCondition));
      }
    }
  } else {
    const operationBuilder = operationBuilders[(condition as ConditionDefinition).operation];
    result.push(operationBuilder(condition as ConditionDefinition));
  }

  return `(` + result.join(` ${(condition as BooleanConditionDefinition).type} `) + `)`;
}

const BitwiseOperators = {
  and: BitwiseOperatorType.AND,
  or: BitwiseOperatorType.OR,
  not: BitwiseOperatorType.NOT
};

const ComparisonOperators = {
  equal: ComparisonOperatorType.EQUAL,
  greater: ComparisonOperatorType.GREATER,
  less: ComparisonOperatorType.LESS,
  greaterOrEqual: ComparisonOperatorType.GREATER_OR_EQUAL,
  lessOrEqual: ComparisonOperatorType.LESS_OR_EQUAL,
  notEqual: ComparisonOperatorType.NOT_EQUAL,
  between: ComparisonOperatorType.BEETWEN,
  like: ComparisonOperatorType.LIKE,
  iLike: ComparisonOperatorType.ILIKE,
  in: ComparisonOperatorType.IN,
  isNull: ComparisonOperatorType.IS_NULL
};

function defineConditions(
  where: BooleanStatement | ConditionStatement | undefined,
  condition: BooleanStatement | ConditionStatement | undefined,
  parentConditionBlock: BooleanConditionDefinition | ConditionDefinition[] | undefined,
  schema: QuerySchema) {

  if (where) {
    if (!Array.isArray(where)) {
      where = [where];
    } else if(!where.length) {
      return;
    }

    // it doesn't metter whether we have only one condition or several ones - we
    // wrap it in AND operator block
    if (!schema.where) {
      schema.where = { type: BitwiseOperatorType.AND, conditions: [] };
      parentConditionBlock = (schema.where as BooleanConditionDefinition).conditions;
    }

    for (let index in where) {
      condition = where[index];

      for (let operator in condition) {
        if (!ComparisonOperators[operator]) {
          if (!BitwiseOperators[operator]) {
            let definedCondition = false;
            // for(let conditionKey in condition[operator]) {
            //   if(ComparisonOperators[conditionKey]) {
            //     condition = condition[operator];
            //     operator = conditionKey;
            //     where[index] = condition;
            //     definedCondition = true;
            //   } 
            // }
            if (!definedCondition) {
              condition = { equal: [operator, condition[operator]] };
              operator = 'equal';
              where[index] = condition;
            }
          }
        }

        if (ComparisonOperators[operator]) { // it is a separete condition
          let operation;
          let filterFieldName;
          let filterFieldNameTrack;
          let comparisonValue;

          if (!Array.isArray(condition[operator])) {
            operation = condition;
            filterFieldName = condition[operator];
            filterFieldNameTrack = filterFieldName.split('.');
            comparisonValue = undefined;
          } else {
            operation = condition[operator];
            filterFieldName = operation[0];
            if(filterFieldName.includes('.')) {
              filterFieldNameTrack = filterFieldName.split('.');
            } else {
              filterFieldNameTrack = [schema.from.alias, filterFieldName];
            }
            comparisonValue = operation.splice(1, operation.length - 1);
          }

          const modelAlias = filterFieldNameTrack[0];
          const source = schema.sources.get(modelAlias);
          if (!source) {
            throw new Error(`Can not find source with alias '${modelAlias}' for condition '${filterFieldName}'`);
          }
          let mainModel: QueryDataSource = source.model;

          const depth = filterFieldNameTrack.length;
          //for(let i = 0; i < depth; i++) {
          const filterField = filterFieldNameTrack[1];
          const level = 2;
          const conditionDefinition = addCondition(filterField, filterFieldNameTrack, comparisonValue, operator, level, depth, mainModel, schema);
          (parentConditionBlock as ConditionDefinition[]).push(conditionDefinition);
          //}
        } else { // it is a bitwise set
          for (let index in condition[operator]) {
            const subCondition = condition[operator][index];
            (parentConditionBlock as BooleanConditionDefinition).conditions = { type: BitwiseOperators[operator], conditions: [] };
            ({ where, condition, parentConditionBlock, schema } = defineConditions(where, subCondition, parentConditionBlock, schema));
          }
        }
      }
    }
  }

  return { where, condition, parentConditionBlock, schema };
}

function addCondition(
  filterField: string,
  filterFieldTrack: string[],
  comparisonValue: any,
  operator: string,
  level: number,
  depth: number,
  mainModel: QueryDataSource,
  schema: QuerySchema): ConditionDefinition {

  let fieldDefinition;
  let conditionDefinition: ConditionDefinition;
  let fieldId: string;
  let dataType: string;
  let referenceModel: QueryDataSource;
  let tableAlias: string;

  ({ fieldId, dataType, referenceModel } = getAttributeDefinition(filterField, mainModel, schema));

  if (level < depth) {

    if (filterField === 'Registrator') {
      fieldId = 'ownerId';
    }
    const subConditionDefinition = addCondition(filterFieldTrack[level], filterFieldTrack, comparisonValue, operator, level + 1, depth, referenceModel, schema);

    const subQuerySourceDefinition = getSourceDefinition(referenceModel);
    tableAlias = schema.tables[subQuerySourceDefinition.tableId].alias;

    const provider = getProvider(schema, {
      alias: tableAlias,
      params: {
        model: referenceModel, 
        position: 'LEFT',
        participator: referenceModel, 
        connector: 'id'
      }
    });

    fieldDefinition = {
      name: 'id',
      alias: 'id',
      tableAlias,
      tableId: referenceModel.definition.tableId,
      model: referenceModel,
      provider,
      fieldId: 'id',
      dataType: 'STRING'
    };

    const subQuerySchema: QuerySchema = {
      application: schema.application,
      fields: new Map([['id', fieldDefinition]]),
      additionalFields: new Map(),
      from: subQuerySourceDefinition,
      tables: { [subQuerySourceDefinition.tableId]: subQuerySourceDefinition },
      models: schema.models,
      sources: new Map([[subQuerySourceDefinition.alias, subQuerySourceDefinition]]),
      where: { type: BitwiseOperatorType.AND, conditions: [subConditionDefinition] },
      providers: schema.providers
    };

    conditionDefinition = {
      field: fieldDefinition,
      etalon: { value: subQuerySchema, isSubQuery: true },
      operation: ComparisonOperators['in'],
      schema
    }
  } else {
    const tableId = mainModel.definition.tableId;
    let sourceDefinition = schema.tables[tableId];
    if (!sourceDefinition) {
      sourceDefinition = getSourceDefinition(mainModel);
      schema.tables[sourceDefinition.tableId] = sourceDefinition;
      schema.tables[sourceDefinition.alias] = sourceDefinition;
      schema.sources.set(sourceDefinition.alias, sourceDefinition);
    }
    tableAlias = sourceDefinition.alias;

    const provider = getProvider(schema, {
      alias: tableAlias,
      params: {
        model: referenceModel, 
        position: 'LEFT',
        participator: referenceModel, 
        connector: 'id'
      }
    });

    fieldDefinition = {
      name: filterField,
      alias: filterField,
      tableAlias,
      tableId: mainModel.definition.tableId,
      model: mainModel,
      provider,
      fieldId,
      dataType
    };


    conditionDefinition = {
      field: fieldDefinition,
      etalon: { value: comparisonValue },
      operation: ComparisonOperators[operator],
      schema
    }
  }

  return conditionDefinition;
}