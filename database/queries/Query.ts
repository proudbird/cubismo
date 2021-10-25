import { stringify } from 'querystring';
import { Sequelize } from 'sequelize';
import Application from '../../classes/application/Application';

import QuerySelectItem from '../QuerySelectItem';

import QueryError from "./QueryError";
import { QueryStatement, QuerySchema, SourceDefinition, TableDefinition, FieldDefinition, LeftJoinStatement, JoinStatement, InnerJoinStatement, RightJoinStatement, FullJoinStatement, JoinType, ConditionStatement, ComparisonOperatorType, BooleanStatement, BooleanConditionDefinition, ConditionDefinition, BitwiseOperatorType, ValueDefinition } from "./types";
import { DataBaseModel, ModelAttributeDefinition, DataBaseTableDefinition, DataBaseModels } from "../types";


export default class Query {

  #driver: Sequelize;
  #application: Application;

  constructor(application: Application, driver: Sequelize) {

    this.#application = application;
    this.#driver = driver;
  }

  async execute(options, model, subscriber) {
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
    
    try {
      const select = [];
      const models = ((this.#driver.models as unknown) as DataBaseModels)
      const query = await buildSQLQuery(models, options);
      const result = await this.#driver.query(query.sql, queryModel);
      if(result && result[0]) {
        const data: [] = result[0];
        for(let index in data) {
          const record = data[index];
          const selectItem = new QuerySelectItem(record, query.fieldsMap);
          select.push(selectItem);
        }
      } 
      return select;
    } catch(err) {
      throw new Error(err.message);
    }
  }

  async raw(sqlString: string) {
    const result = await this.#driver.query(sqlString);
    return result;
  }
}

function buildSQLQuery(models: DataBaseModels, query: QueryStatement): { sql: string, fieldsMap: Map<string, FieldDefinition> } {

  let schema: QuerySchema = { fields: new Map, from: {}, joins: {}, tables: {}, models: models, sources: new Map() };

  return { sql: buildSQLStatement(query, schema), fieldsMap: schema.fields};

}

function buildSQLStatement(query: QueryStatement, schema: QuerySchema): string {

  let result: string;
  defineFrom(query, schema);
  defineFields(query, schema);
  
  const joins: Map<InnerJoinStatement | 
  LeftJoinStatement  | 
  RightJoinStatement | 
  FullJoinStatement, { 
    statement: JoinStatement,
    joinType: JoinType,
    model: DataBaseModel 
  }
  > = new Map();
  
  for(let join of query.joins) {
    const { statement, joinType } = getJoinStatement(join);
    const joinModel = defineJoinFrom(statement, joinType, schema);
    joins.set(join, { statement, joinType, model: joinModel });
  }
  
  defineConditions(query.where, undefined, undefined, schema);
  
  joins.forEach((value, join) => {
      defineJoinFields(value.statement, value.model, schema);
  });

  schema.groupBy = query.groupBy;

  result = buildSQLQueryString(schema);

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
  for(let key of Object.getOwnPropertyNames(join)) {
    statement = join[key];
    joinType = typeMap.get(key);
    if(!joinType) {
      throw new Error(`Wrong join statement '${key}'`);
    }
  }

  return { statement, joinType };
}

function defineFrom(query: QueryStatement, schema: QuerySchema): void {

  const from = getFrom(query, schema);
  
  schema.from = {
    name:    from.name,
    alias:   from.alias,
    tableId: from.model.definition.tableId,
    model:   from.model
  }

  schema.tables[from.model.definition.tableId] = from;
  schema.sources.set(from.alias, from);
}

function defineJoinFrom(query: JoinStatement, joinType: JoinType, schema: QuerySchema): DataBaseModel {

    const joinFrom = getFrom(query, schema);
    addJoin(joinFrom.model, joinType, schema, query);

    return joinFrom.model;
}

function getFrom(query: QueryStatement | JoinStatement, schema: QuerySchema): SourceDefinition {

  let name: string;
  let alias: string;
  let fromModel: DataBaseModel;

  if(typeof query.from === 'string') {
    const statement = getNameAndAlias(query.from);
    name = statement.name;
    alias = statement.alias;
    fromModel = schema.models[name];
    if(!fromModel) {
      throw new QueryError(`Can not find sourse table '${name}', described in 'FROM' clause`);
    }
  } else if(isSubquery((query.from as QueryStatement))) {
    throw new QueryError(`Selection from subquery is not realized yet`);
  }

  return getSourceDefinition(fromModel, alias);
}

function isSubquery(query: QueryStatement): boolean {
  
  let result = false;
  // we just check whether query 'from' property has properties, wich determin it as a Query Statement
  if(query.select && query.from) {
    result = true;
  }

  return result;
}

function defineFields(query: QueryStatement, schema: QuerySchema): void {

  if(!query.select) {
    return;
  }

  const selectFields = query.select.split(',');

  for (let fieldStatement of selectFields) {
    fieldStatement = fieldStatement.trim();
    if(fieldStatement) {
      defineField(fieldStatement, schema);
    }
  }
}

function defineJoinFields(query: JoinStatement, joinModel: DataBaseModel, schema: QuerySchema): void {

  if(!query.select) {
    return;
  }

  const selectFields = query.select.split(',');

  for (let fieldStatement of selectFields) {
    fieldStatement = fieldStatement.trim();
    if(fieldStatement) {
      defineJoinField(fieldStatement, joinModel, schema, query);
    }
  }
}

function defineField(fieldStatement: string, schema: QuerySchema): void {

  const { name, alias } = getNameAndAlias(fieldStatement);

  if(name.includes('.')) {
    determineReferenceJoins(name, schema);
  } else {
    addFieldDefinition(name, alias, schema.from.model, schema);
  }
}

function defineJoinField(fieldStatement: string, joinModel: DataBaseModel, schema: QuerySchema, query: JoinStatement): void {

  const { name, alias } = getNameAndAlias(fieldStatement);

  if(name.includes('.')) {
    determineJoins(name, alias, schema, query);
  } else {   
    addFieldDefinition(name, alias, joinModel, schema);
  }
}

function addFieldDefinition(fieldName: string, alias: string, model: DataBaseModel, schema: QuerySchema): void {
  
  let fieldId = fieldName;
  let dataType: string;

  const lang = model.application.lang;
  const modelDefinition = model.definition;
  let referenceModelId = modelDefinition.id;;
  if (fieldName === 'Name') {
    if (modelDefinition.nameLang && modelDefinition.nameLang.length) {
      fieldId = fieldId + '_' + lang;
    }
    dataType = 'STRING';
  } else if (fieldName === 'id') {
    fieldId = 'id';
    dataType = 'STRING ';
  } else if (fieldName === 'Reference') {
    fieldId = 'id';
    dataType = 'FK';
  } else if (fieldName === 'Code') {
    dataType = modelDefinition.codeType;
  } else if (fieldName === 'Parent') {
    fieldId = 'parentId';
    dataType = 'FK';
  } else if (fieldName === 'Owner') {
    fieldId = 'ownerid';
    dataType = 'FK';
    referenceModelId = modelDefinition.owners[0];
  } else {
    const attribute = modelDefinition.attributes[fieldName];
    if(!attribute) {
      throw new QueryError(`Can not find attribute '${fieldName}' in ${model.name}`);
    }
    if (attribute.type.lang && attribute.type.lang.length) {
      fieldId = attribute.fieldId + '_' + lang;
    } else {
      fieldId = attribute.fieldId;
      if(attribute.type.dataType === 'FK') {
        referenceModelId = attribute.type.reference.modelId;
      }
    }
    dataType = attribute.type.dataType;
  }


  schema.fields.set(alias.toLocaleLowerCase(), {
    name: fieldName,
    alias,
    tableId: modelDefinition.tableId,
    model: schema.models[referenceModelId],
    fieldId,
    dataType
  });
}

function getNameAndAlias(sourceStatement: string): { name: string, alias: string} {
  
  const statement = sourceStatement.replace(' as ', ' AS ').split(' AS ');
  let name: string = statement[0];
  let alias: string = name.replace(/\./g, '');
  if(statement.length > 1) {
    alias = statement[1]; 
  }

  return { name, alias };
}

function determineReferenceJoins(fieldName: string, schema: QuerySchema): void {

    const track = fieldName.split('.');
    let mainModel = schema.from.model;
    let parentField: FieldDefinition;
    for(let i = 0; i < track.length - 1; i++) {
      const attributeName = track[i];
      const result = addReferenceJoin(attributeName, fieldName, mainModel, schema, i + 1, track.length, parentField);
      mainModel = result.mainModel;
      parentField = result.parentField;
    }

    const attributeName = track[track.length-1];
    addFieldDefinition(attributeName, parentField.alias + attributeName, mainModel, schema);
}

function determineJoins(fieldName: string, alias: string, schema: QuerySchema, query: JoinStatement): void {

  const track = fieldName.split('.');
  const joinFrom = getFrom(query, schema);
  let mainModel = joinFrom.model;
  let parentField: FieldDefinition;
  for(let i = 0; i < track.length - 1; i++) {
    const attributeName = track[i];
    const result = addReferenceJoin(attributeName, fieldName, mainModel, schema, i + 1, track.length, parentField);
    mainModel = result.mainModel;
    parentField = result.parentField;
  }

  const attributeName = track[track.length-1];
  addFieldDefinition(attributeName, alias, mainModel, schema);
}

function addReferenceJoin(
  attributeName: string, 
  fieldName: string, 
  mainModel: DataBaseModel, 
  schema: QuerySchema, 
  level: number, 
  trackLength: number,
  parentField?: FieldDefinition
): { mainModel: DataBaseModel, parentField: FieldDefinition } {

  const modelDefinition = mainModel.definition;
  let attribute: ModelAttributeDefinition;
  let referenceModelId: string;
  let referenceModel: DataBaseModel;

  const lang = mainModel.application.lang;
  
  if (fieldName === 'Name') {
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
  } else if (fieldName === 'Reference') {
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
  } else if (fieldName === 'Code') {
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
  } else if(attributeName === 'Owner') {
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

  } else if(attributeName === 'Parent') {
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
    if(!attribute) {
      throw new QueryError(`Can not find attribute '${attributeName}' in ${mainModel.name}`);
    }

    if(level < trackLength && attribute.type.dataType !== 'FK') {
      throw new QueryError(`Attribute '${attributeName}' in reference field '${fieldName}' is not a reference. It is a type of '${attribute.type.dataType}'`);
    }

    referenceModelId = attribute.type.reference.modelId;
  }
  
  referenceModel = ((mainModel.sequelize.models[referenceModelId] as unknown) as DataBaseModel);
  if(!referenceModel) {
    throw new QueryError(`Can not find sourse table with ID '${referenceModelId}' as reference table, described id fielad '${fieldName}'`);
  }
  
  let leftTableAlias = 'l_' + Utils.sid();
  let leftTableDefinition = schema.tables[mainModel.definition.tableId];
  if(leftTableDefinition) {
    leftTableAlias = leftTableDefinition.alias;
  }
  let rigthTableAlias = 'r_' + Utils.sid();
  let rigthTableDefinition = schema.tables[referenceModel.definition.tableId];
  if(rigthTableDefinition) {
    rigthTableAlias = rigthTableDefinition.alias;
  }

  const leftTable = (getSourceDefinition(mainModel, leftTableAlias) as TableDefinition & { on: FieldDefinition});
  const rigthTable = (getSourceDefinition(referenceModel, rigthTableAlias) as TableDefinition & { on: FieldDefinition});

  const leftTableReferenceField = {
    name: attributeName,
    alias: parentField ? parentField.alias + attributeName : attributeName,
    tableId: mainModel.definition.tableId,
    model:  schema.models[attribute.type.reference.modelId],
    fieldId: attribute.fieldId,
    dataType: attribute.type.dataType
  }

  if(level === trackLength) {
    schema.fields.set(leftTableReferenceField.alias.toLocaleLowerCase(), leftTableReferenceField);
  }

  const rigthTableReferenceField = {
    name: 'id',
    tableId: referenceModel.definition.tableId,
    model:  referenceModel,
    fieldId: 'id',
    dataType: 'FK'
  }
  
  leftTable.on = leftTableReferenceField;
  rigthTable.on = rigthTableReferenceField;

  if(!schema.joins[mainModel.modelName]) {
    schema.joins[mainModel.modelName] = [];
  }
  schema.joins[mainModel.modelName].push({
    joinType: JoinType.LEFT, 
    leftTable,
    rigthTable
  });

  schema.tables[leftTable.tableId] = leftTable;
  schema.tables[rigthTable.tableId] = rigthTable;

  schema.sources.set(leftTable.alias, leftTable);
  schema.sources.set(rigthTable.alias, rigthTable);

  return { mainModel: referenceModel, parentField: leftTableReferenceField };
}

function getAttributeDefinition(attributeName: string, model: DataBaseModel): 
  { dataType: string, fieldId: string, referenceModel?: DataBaseModel,  } {

  const modelDefinition = model.definition;
  let attribute: ModelAttributeDefinition;
  let referenceModelId: string;
  let referenceModel: DataBaseModel;
  
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
  } else if(attributeName === 'Reference') {
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

  } else if(attributeName === 'Owner') {
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

  } else if(attributeName === 'Parent') {
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
    if(!attribute) {
      throw new QueryError(`Can not find attribute '${attributeName}' in ${model.name}`);
    }

    if(attribute.type.dataType === 'FK') {
      referenceModelId = attribute.type.reference.modelId;
      referenceModel = ((model.sequelize.models[referenceModelId] as unknown) as DataBaseModel);
      if(!referenceModel) {
        throw new QueryError(`Can not find sourse table with ID '${referenceModelId}' as reference table, described id field '${attributeName}'`);
      }
    }
  }

  return { dataType: attribute.type.dataType, fieldId: attribute.fieldId, referenceModel };
}

function addJoin(
  rigthModel: DataBaseModel, 
  joinType: JoinType,
  schema: QuerySchema, 
  query: JoinStatement
): void {

  const onLeftTrack = query.on[0].split('.');
  const leftModelAlias = onLeftTrack[0];
  
  const onRigthTrack = query.on[1].split('.');
  const rigthModelAlias = onRigthTrack[0];
  const onRigthFieldName = onRigthTrack[1];
  
  const leftSource = {...schema.sources.get(leftModelAlias)};
  const leftModel = leftSource.model;
  if(!leftModel) {
    throw new QueryError(`Can not find sourse table with alias '${leftModelAlias}' as reference table`);
  }
  
  const leftTable = (leftSource as TableDefinition & { on: FieldDefinition});
  const rigthTable = (getSourceDefinition(rigthModel, rigthModelAlias) as TableDefinition & { on: FieldDefinition});

  const onLeftFieldName = onLeftTrack[1];
  const leftOnField = getAttributeDefinition(onLeftFieldName, leftModel);
  const leftTableReferenceField = {
    name: onLeftFieldName,
    tableId: leftModel.definition.tableId,
    model: leftOnField.referenceModel,
    fieldId: leftOnField.fieldId,
    dataType: leftOnField.dataType
  }
  
  const rigthOnField = getAttributeDefinition(onRigthFieldName, rigthModel);
  const rigthTableReferenceField = {
    name: onRigthFieldName,
    tableId: rigthModel.definition.tableId,
    model: rigthOnField.referenceModel,
    fieldId: rigthOnField.fieldId,
    dataType: rigthOnField.dataType
  }
  
  leftTable.on = leftTableReferenceField;
  rigthTable.on = rigthTableReferenceField;

  if(!schema.joins[leftModel.modelName]) {
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
}

function getSourceDefinition(model: DataBaseModel, alias?: string): SourceDefinition {
  
  return {
    name: model.modelName,
    alias: alias || model.modelName.replace(/\./g, ''),
    tableId: model.tableName,
    model: model
  };
}

function buildSQLQueryString(schema: QuerySchema): string {

  let fields = [];

  schema.fields.forEach((fieldDefinition) => {
    const tableId = fieldDefinition.tableId;
    const tableDefinition = schema.tables[tableId];
    const tableAlias = tableDefinition.alias;
    fields.push(`${tableAlias}."${fieldDefinition.fieldId}" AS ${fieldDefinition.alias}`);
  })

  let result = `SELECT ${fields.join(', ')} `;
  result += ` FROM "${schema.from.tableId}" ${schema.from.alias} `;

  for(let key in schema.joins) {
    const joins = schema.joins[key];
    for(let join of joins) {
      result += `${join.joinType} "${join.rigthTable.tableId}" ${join.rigthTable.alias} `;

      let leftCast = '';
      let rigthCast = '';
      if(join.leftTable.on.dataType === 'FK' && join.rigthTable.on.dataType !== 'FK') {
        leftCast = '::"varchar"';
      } else if(join.rigthTable.on.dataType === 'FK' && join.leftTable.on.dataType !== 'FK') {
        rigthCast = '::"varchar"';
      }
      result += `ON ${join.leftTable.alias}."${join.leftTable.on.fieldId}"${leftCast} = ${join.rigthTable.alias}."${join.rigthTable.on.fieldId}"${rigthCast} `
    }
  }

  if(schema.where) {
    result += ` WHERE ${buildWhereClause(schema)}`;
  }

  if(schema.groupBy) {
    result += ` GROUP BY ${schema.groupBy.join(', ')}`;
  }

  return result;
}

function buildWhereClause(schema: QuerySchema): string {

  let result: string[] = [];

  const conditions: BooleanConditionDefinition | ConditionDefinition[] = (schema.where as BooleanConditionDefinition).conditions;
  for(let index in conditions) {
    const condition = conditions[index];
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
  'IN': buildOperationIn,
  'IS NULL': buildOperationBoolean,
  'IS NOT NULL': buildOperationBoolean,
  'IS TRUE': buildOperationBoolean,
  'IS FALSE': buildOperationBoolean
}

function getComperisonValue(condition: ConditionDefinition): string {

  let result: string;

  let value = condition.etalon.value;

  if(condition.etalon.isSubQuery) {
    result = `(${buildSQLQueryString(value)})`;
  } else {
    value = condition.etalon.value[0];
    result = `${value}`;
    if(condition.field.dataType === 'FK') {
      if(Array.isArray(value)) {
        result = getComperisonValueFromCollection(value);
      } else {
        result = `'${value.id}'`;
      }
    } else {
      if(typeof value === 'string') {
        result = `'${value}'`;
      } if(Array.isArray(value)) {
        let values: string[] = [];
        for(let val of value) {
          values.push(`'${val}'`);
        }
        result = values.join(", ");
      }
    }
  }

  return result;
}

function getComperisonValueFromCollection(values: {id: string}[]): string {

  let result: string[] = [];
  for(let value of values) {
    result.push(`'${value.id}'`);
  }

  return result.join(", ");
}

function buildOperationComparison(condition: ConditionDefinition): string {

  let result = `${condition.field.tableAlias}."${condition.field.fieldId}" ${condition.operation} ${getComperisonValue(condition)}`;

  return result;
}

function buildOperationBetween(condition: ConditionDefinition): string {

  let result = `${condition.field.tableAlias}."${condition.field.fieldId}" ${condition.operation} ${condition.etalon.value[0]} AND ${condition.etalon.value[1]})`;

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

function buildOperation(condition: BooleanConditionDefinition | ConditionDefinition): string {

  let result: string[] = [];

  if(condition['type']) { // Bitwise condition
    if(condition['type'].type) { // Bitwise subcondition
      result.push(buildOperation(condition));
    } else {
      const subConditions = (condition as BooleanConditionDefinition).conditions as ConditionDefinition[];
      for(let subCondition of subConditions) {
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
  in: ComparisonOperatorType.IN,
};

function defineConditions(
  where: BooleanStatement | ConditionStatement | undefined, 
  condition: BooleanStatement | ConditionStatement | undefined,
  parentConditionBlock: BooleanConditionDefinition | ConditionDefinition[] | undefined,
  schema: QuerySchema) {

  if(where) {
    // it doesn't metter whether we have only one condition or several ones - we
    // wrap it in AND operator block
    if(!schema.where) {
      schema.where = { type: BitwiseOperatorType.AND, conditions: [] };
      parentConditionBlock = (schema.where as BooleanConditionDefinition).conditions;
    }

    if(!Array.isArray(where)) {
      where = [where];
    }
    
    for(let index in where) {
      condition = where[index];

      for(let operator in condition ) {
        if(!ComparisonOperators[operator]) {
          if(!BitwiseOperators[operator]) {
            condition = { equal: [operator, condition[operator]] };
            operator = 'equal';
            where[index] = condition;
          }
        }

        if(ComparisonOperators[operator]) { // it is a separete condition
          const operation = condition[operator];
          const filterFieldName = operation[0];
          const filterFieldNameTrack = filterFieldName.split('.');

          const modelAlias = filterFieldNameTrack[0];
          const source = schema.sources.get(modelAlias);
          if(!source) {
            throw new Error(`Can not find source with alias '${modelAlias}' for condition '${filterFieldName}'`);
          }
          let mainModel: DataBaseModel = source.model;

          const depth = filterFieldNameTrack.length;
          //for(let i = 0; i < depth; i++) {
            const filterField = filterFieldNameTrack[1];
            const level = 2;
            const comparisonValue = operation.splice(1, operation.length - 1);
            const conditionDefinition = addCondition(filterField, filterFieldNameTrack, comparisonValue, operator, level, depth, mainModel, schema);
            (parentConditionBlock as ConditionDefinition[]).push(conditionDefinition);
          //}
        } else { // it is a bitwise set
          for(let index in condition[operator]) {
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
      mainModel: DataBaseModel, 
      schema: QuerySchema): ConditionDefinition {

  let fieldDefinition;
  let conditionDefinition: ConditionDefinition;
  let fieldId: string;
  let dataType: string;          
  let referenceModel: DataBaseModel;
  let tableAlias: string;

  ({ fieldId, dataType, referenceModel } = getAttributeDefinition(filterField, mainModel));

  if(level < depth) {

    
    const subConditionDefinition = addCondition(filterFieldTrack[level], filterFieldTrack, comparisonValue, operator, level+1, depth, referenceModel, schema);
    
    const subQuerySourceDefinition = getSourceDefinition(referenceModel);
    tableAlias = schema.tables[subQuerySourceDefinition.tableId].alias;
    fieldDefinition = {
      name: 'id',
      alias: 'id',
      tableAlias,
      tableId: referenceModel.definition.tableId,
      model: referenceModel,
      fieldId: 'id',
      dataType: 'STRING'
    };
    
    const subQuerySchema: QuerySchema = {
      fields: new Map([['id', fieldDefinition]]),
      from: subQuerySourceDefinition,
      tables: { [subQuerySourceDefinition.tableId]: subQuerySourceDefinition },
      models: schema.models,
      sources: new Map([[subQuerySourceDefinition.alias, subQuerySourceDefinition]]),
      where: { type: BitwiseOperatorType.AND, conditions: [subConditionDefinition] }
    };
    
    conditionDefinition = {
      field: fieldDefinition,
      etalon: { value: subQuerySchema, isSubQuery: true },
      operation: ComparisonOperators['in']
    }
  } else {
    const tableId = mainModel.definition.tableId;
    let sourceDefinition = schema.tables[tableId];
    if(!sourceDefinition) {
      sourceDefinition = getSourceDefinition(mainModel);
      schema.tables[sourceDefinition.tableId] = sourceDefinition;
      schema.sources.set(sourceDefinition.alias, sourceDefinition);
    }
    tableAlias = sourceDefinition.alias;
    fieldDefinition = {
      name: filterField,
      alias: filterField,
      tableAlias,
      tableId: mainModel.definition.tableId,
      model: mainModel,
      fieldId,
      dataType
    };


    conditionDefinition = {
      field: fieldDefinition,
      etalon: { value: comparisonValue },
      operation: ComparisonOperators[operator]
    }
  }    

  return conditionDefinition;
}