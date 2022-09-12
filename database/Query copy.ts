import { Sequelize } from 'sequelize';
import Application from '../classes/application/Application';

import QuerySelectItem from './QueryResultEntry';
import Utils, { sid } from '../common/Utils';

import DBDriver from '../database/DBDriver';
import { unwatchFile } from 'fs';

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
      const query = await buildSQLQuery(this.#driver, options, subscriber);
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

async function buildSQLQuery(driver, query, subscriber) {

  const tables = new Map();
  const fieldsMap = new Map();

  let fromIndex = 1;

  let result = '';
  let from;
  let model;

  const fromStatement = query.FROM || query.from;
  
  let tempTableName: string;
  const as = fromStatement.AS || fromStatement.as;
  if(as) {
    const table = as[0];
    if(table.columns && table.rows) {
      const columns = [];
      for(let col of table.columns) {
        columns.push(describeColumn(col));
      };
      tempTableName = `temp_${sid()}`;
      from = { mame: tempTableName, alias: as[1]};
      model = { tableName: tempTableName, associations: {} }
      model.alias = from.alias;
      result = `CREATE TEMP TABLE ${tempTableName} (${columns.join(', ')});\n`;
      const insertions = defineInsertions(table.columns, tempTableName, table.rows);
      
      result = result + insertions.join(' ');
      //await driver.query(result);
    }
  } else {
    from = getAliasStatement(fromStatement);
    model = driver.models[from.name];
    model.alias = from.alias;
    tables.set(from.alias, model);
    if (!model) {
      throw new Error("Can't find DB model <" + from + ">");
    } else if (subscriber) {
      // if(!Utils.has(model, "subscribers")) {
      //   model.subscribers = {};
      // }
      model.subscribers[subscriber.config.id] = subscriber;
    }
  }
  
  //SELECT
  
  const select: string = query.SELECT || query.select;
  const joins = query.JOINS || query.joins;
  const selectFields = select.split(',');
  let fields = [];

  const referenceJoins = {};

  let fieldDescription;
  for (let key of selectFields) {
    const field: string = key.trim();
    if(tempTableName) {
      fieldDescription = getFieldDescriptionTempTable(as, field);
    } else {
      fieldDescription = getFieldDescription(model, field);
    }
    if(fieldDescription.toJoin) {
      const typeDefinition = fieldDescription.attribute.type;
      if(!referenceJoins[typeDefinition.model.name]) {
        referenceJoins[typeDefinition.model.name] = { leftModel: typeDefinition.referenceModel, rigthModels: {} };
      }
      referenceJoins[typeDefinition.model.name].rigthModels[typeDefinition.model.name] = typeDefinition.model;
      const tableAlias = typeDefinition.model.alias;
      const fieldAlias = `${tableAlias}_${fieldDescription.fieldId}`.toLowerCase();
      fieldsMap.set(fieldAlias, fieldDescription.attribute);
      fields.push(`${tableAlias}."${fieldDescription.fieldId}" AS ${fieldAlias}`);
    } else {
      const fieldAlias = `${from.alias}_${fieldDescription.fieldId}`.toLowerCase();
      fieldsMap.set(fieldAlias, fieldDescription.attribute);
      if(tempTableName) {
        fields.push(`${from.alias}.${fieldDescription.fieldId} AS ${fieldAlias}`);
      } else {
        fields.push(`${from.alias}."${fieldDescription.fieldId}" AS ${fieldAlias}`);
      }
    }
  }
  
  // JOINS
  let joinsResult = '';
  if(joins) {
    for(let index in joins) {
      const join = joins[index];
       //LEFT JOIN
      const leftJoin = join.LEFTJOIN || join.leftjoin;
      if(leftJoin) {
        const joinFromStatement = leftJoin.FROM || leftJoin.from;
        const joinFrom = getAliasStatement(joinFromStatement);
        const joinModel = driver.models[joinFrom.name]
        const joinTableName = joinModel.tableName;
        joinModel.alias = joinFrom.alias;
        tables.set(joinFrom.alias, joinModel);

        const leftJoinSelect = leftJoin.SELECT || leftJoin.select;
        const leftSelectFields = leftJoinSelect.split(',');
        for (let key of leftSelectFields) {
          const field = key.trim();
          const fieldDescription = getFieldDescription(joinModel, field);
          if(fieldDescription.toJoin) {
            const typeDefinition = fieldDescription.attribute.type;
            if(!referenceJoins[typeDefinition.model.name]) {
              referenceJoins[typeDefinition.model.name] = { leftModel: typeDefinition.referenceModel, rigthModels: {} };
            }
            referenceJoins[typeDefinition.model.name].rigthModels[typeDefinition.model.name] = typeDefinition.model;
            const tableAlias = typeDefinition.model.alias;
            const fieldAlias = `${tableAlias}_${fieldDescription.fieldId}`.toLowerCase();
            fieldsMap.set(fieldAlias, fieldDescription.attribute);
            fields.push(`${tableAlias}."${fieldDescription.fieldId}" AS ${fieldAlias}`);
            // join statement will be later
            continue;
          } else {
            const fieldAlias = `${joinFrom.alias}_${fieldDescription.fieldId}`.toLowerCase();
            fieldsMap.set(fieldAlias, fieldDescription.attribute);
            fields.push(`${joinFrom.alias}."${fieldDescription.fieldId}" AS ${fieldAlias}`);
          }
        }

        const leftJoinOn = leftJoin.ON || leftJoin.on;
        const on = getOnStatement(leftJoinOn, tables);

        let leftCast = '';
        let rigthCast = '';
        if(on.leftFieldType.dataType === 'FK' && on.rigthFieldType.dataType !== 'FK') {
          leftCast = '::"varchar"';
        } else if(on.rigthFieldType.dataType === 'FK' && on.leftFieldType.dataType !== 'FK') {
          rigthCast = '::"varchar"';
        }
        joinsResult += ` LEFT JOIN "${joinTableName}" ${joinFrom.alias} ON ${on.leftTableAlias}."${on.leftFieldName}"${leftCast} = ${on.rigthTableAlias}."${on.rigthFieldName}"${rigthCast}`;
      }
    }
  }

  for(let leftModelName in referenceJoins) {
    const leftModel = referenceJoins[leftModelName].leftModel;
    const leftTableAlias = leftModel.alias;
    const rigthModels = referenceJoins[leftModelName].rigthModels;
    for(let rigthModelName in rigthModels) {
      const rigthModel = rigthModels[rigthModelName];
      joinsResult += ` LEFT JOIN "${rigthModel.tableName}" ${rigthModel.alias} ON ${leftModel.alias}."${leftModel.referenceField}" = ${rigthModel.alias}."id"`;
    }
  }

  //FROM
  result += ' SELECT ' + fields.join(', ');
  if(tempTableName) {
    result += ` FROM ${model.tableName} ${from.alias}`; // if table created dynamically we don't need brackets
  } else {
    result += ` FROM "${model.tableName}" ${from.alias}`;
  }
  
  result += joinsResult;

  //WHERE
  const where = query.WHERE || query.where;
  if(where) {
    if (Array.isArray(where) && where.length > 0) {
      let newWhere = [];
      for (let i = 0; i < where.length; i++) {
        newWhere.push(buildOperation(model, where[i]));
      }
      result = result + ' WHERE ' + newWhere.join(' AND ');
    } else if (typeof where === "object" && !Array.isArray(where)) {
      result = result + ' WHERE ' + buildOperation(model, where);
    } else if(where && !Array.isArray(where)) {
      throw new Error("Wrong format of 'WHERE' statement.")
    }
  }

  //ORDER
  const order = query.ORDER || query.order;
  if(order) {
    const inside = order[0];
    if (Array.isArray(inside) && inside.length) {
      let newOrder = [];
      for (let i = 0; i < order.length; i++) {
        newOrder.push("\"" + order[i][0] + "\" " + order[i][1]);
      }
      result = result + ' ORDER BY ' + newOrder.join(', ');
    } else if (Array.isArray(order)) {
      result = result + ' ORDER BY ' + "\"" + order[0] + "\" " + order[1];
    } else {
      throw new Error("Wrong format of 'ORDER' statement.")
    }
  }
  
  //LIMIT
  const limit = query.LIMIT || query.limit;
  if(limit) {
    result = result + ' LIMIT ' + limit;
  }

  //OFFSET
  const offset = query.OFFSET || query.offset;
  if(offset) {
    result = result + ' OFFSET ' + offset;
  }

  return { sql: result, fieldsMap };
}

function buildOperation(model, operation) {

  var buildOperations = function (operations, newOperations?) {
    for (let i = 0; i < operations.length; i++) {
      let operation = operations[i];
      if (operation && Array.isArray(operation)) {
        buildOperations(operation);
      }
      newOperations.push(buildOperation(model, operation));
    }
  }

  let operator;
  for (operator in operation) {
    let param = operation[operator][0];
    let value = operation[operator][1];

    const association = model.associations[param];
    if (association) {
      param = association.identifierField;
      value = value[association.targetIdentifier];
    }

    if (Array.isArray(param)) {
      let newOperations = [];
      buildOperations(param, newOperations);
      param = newOperations;
    }

    switch (operator) {
      case "EQ":
        if (value === null || value === undefined) {
          return "\"" + param + "\" IS NULL";
        } else if (value === true) {
          return "\"" + param + "\" IS TRUE";
        } else if (value === false) {
          return "\"" + param + "\" IS FALSE";
        } else {
          return "\"" + param + "\" = '" + value + "'";
        }
      case "LIKE":
        return "\"" + param + "\" LIKE '" + value + "'";
      case "iLIKE":
        return "\"" + param + "\" iLIKE '" + value + "'";
      case "AND":
        return "(" + param.join(" AND ") + ")";
      case "OR":
        return "(" + param.join(" OR ") + ")";
      case "AS":
        return "\"" + param + "\" AS \"" + value + "\"";
      case "EXISTSAS":
        return "EXISTS (" + param + ") AS \"" + value + "\"";
      case "STARTSWITH":
        return "\"" + param + "\" LIKE '" + value + "%'";
    }
  }
}

function getFieldDescription(_model: any, fieldStatement: string): {fieldId: string, attribute: { name: string, alias: string, type: any }, toJoin: boolean} {

  let dataType = { 
    dataType: undefined,
    reference: undefined,
    model: undefined,
    referenceModel: undefined,
    referenceField: undefined
  };

  let toJoin = false;

  const field = getAliasStatement(fieldStatement);
  if(field.name.includes('.')) {
    // we are trying to get fields from the reference
    const track = field.name.split('.');
    // now only 2 steps we can deal with
    if(track.length > 2) {
      throw new Error(`We can deal with only 2-step inclusion: [${field.name}]`);
    }
    const attribute = track[0];
    const definition = _model.definition;
    const element = definition.attributes[attribute];
    if(!element) {
      throw new Error(`Can not find attribute '${attribute}' in ${_model.name}`);
    }
    if(element.type.dataType !== 'FK') {
      throw new Error(`Attribute '${attribute}' is not a reference. It is a type of '${element.type.dataType}'`);
    }
    dataType.referenceModel = _model;
    _model.referenceField = element.fieldId;
    // _model.referenceAlias = _model.name.replace(/\./g, '');
    _model = _model.sequelize.models[element.type.reference.modelId];
    _model.alias = _model.name.replace(/\./g, '');
    if(!_model) {
      throw new Error(`Can not find model with id '${element.type.reference.modelId}'`);
    }
    field.name = track[1];
    field.alias = field.alias || track.join('');
    toJoin = true;
  }

  let fieldId: string = field.name;

  //let attribute = field;

  const lang = _model.application.lang;
  const definition = _model.definition;
  //if(definition.class === 'Catalogs') {
    if (field.name === 'Name') {
      if (definition.nameLang && definition.nameLang.length) {
        fieldId = fieldId + '_' + lang;
      }
      dataType.dataType = 'STRING';
    } else if (field.name === 'Reference') {
      fieldId = 'id';
      dataType.dataType = 'FK';
    } else if (field.name === 'Code') {
      dataType.dataType = definition.codeType;
    } else if (field.name === 'Parent') {
      fieldId = 'parentId';
      dataType.dataType = 'FK';
    } else if (field.name === 'Owner') {
      fieldId = 'ownerid';
      dataType.dataType = 'FK';
      dataType.reference = definition.owners[0];
    } else {
      const element = definition.attributes[field.name];
      if(element) {
        if (element.type.lang && element.type.lang.length) {
          fieldId = element.fieldId + '_' + lang;
        } else {
          fieldId = element.fieldId;
        }

        dataType.dataType = element.type;
      }
    }
  //}

  dataType.model = _model;

  return { fieldId, attribute: { name: field.name, alias: field.alias, type: dataType }, toJoin};
}

function getOnStatement(on: string[], tables: Map<string, any>) {

  const leftPart = on[0].split('.');
  const leftTable: string = leftPart[0];
  const leftField: string = leftPart[1];
  let leftModel = tables.get(leftTable);
  let leftFieldDescription;
  if(leftModel) {
    leftFieldDescription = getFieldDescription(leftModel, leftField);
  } else {
    leftModel = { tableName: leftTable };
    leftFieldDescription = { fieldId: leftField, attribute: { type: { dataType: 'STRING' } } };
  };

  const rigthPart = on[1].split('.');
  const rigthTable: string = rigthPart[0];
  const rigthField: string = rigthPart[1];
  let rigthModel = tables.get(rigthTable);
  let rigthFieldDescription;
  if(rigthModel) {
    rigthFieldDescription = getFieldDescription(rigthModel, rigthField);
  } else {
    rigthModel = { tableName: rigthTable };
    rigthFieldDescription = { fieldId: rigthField, attribute: { type: { dataType: 'STRING' } } };
  };

  return {
    leftTableName: leftModel.tableName,
    leftTableAlias: leftTable,
    leftFieldName: leftFieldDescription.fieldId,
    leftFieldType: leftFieldDescription.attribute.type,
    rigthTableName: rigthModel.tableName,
    rigthTableAlias: rigthTable,
    rigthFieldName: rigthFieldDescription.fieldId,
    rigthFieldType: rigthFieldDescription.attribute.type
  }
}

function getAliasStatement(source: string) {

  const statement = source.replace(' as ', ' AS ').split(' AS ');
  let name: string = statement[0];
  let alias: string = name.replace(/\./g, '');
  if(statement.length > 1) {
    alias = statement[1]; 
  }

  return { name, alias }
}

function describeColumn(col) {

  let definition: string;

  for(let key in col) {
    const type = describeType(col[key]);
    definition = `${key} ${type}`
  }

  return definition;
}

function describeType(description) {

  switch (description[1]) {
    case 'S':
      return `VARCHAR(${description[2]})`;
    case 'N':
      return `NUMERIC(${description[2]},${description[3]})`;
    case 'B':
      return `BOOLEAN`;
    case 'D':
       return `TIMESTAMP`;
  }
}

function defineInsertions(columns, tableName, rows): any[] {

  const insertions = [];
  // for(let row of rows) {
  //   const values = defineValues(columns, row);
  //   insertions.push(`INSERT INTO ${tableName} VALUES(${values.join(', ')});\n`);
  // };

  for(let i=0; i<rows.length; i++) {
    const row = rows[i];
    const values = defineValues(columns, row);
    insertions.push(`INSERT INTO ${tableName} VALUES(${values.join(', ')});\n`);
  };

  return insertions;
}

function defineValues(columns, row): any[] {

  const values = [];
  for(let col of columns) {
    for(let colName in (col as any)) {
      const value = Utils.get(row, col[colName][0]);
      if(Utils.isString(value)) {
        values.push(`'${value}'`);
      } else {
        values.push(value);
      };
    }
  };

  return values;
}

function getFieldDescriptionTempTable(as: any, fieldStatement: string): {fieldId: string, attribute: { name: string, alias: string, type: any }} {

  const field = getAliasStatement(fieldStatement);

  //let attribute = field;
  let dataType = { 
    dataType: undefined,
    reference: undefined,
    model: undefined
  };

  const col = Utils.find(as[0].columns, field.name);
  if(col) {
    switch (col[field.name][1]) {
      case 'S':
        dataType.dataType = 'STRING';
        break;
      case 'N':
        dataType.dataType = 'NUMERIC';
        break;
      case 'B':
        dataType.dataType = 'BOOLEAN';
        break;
      case 'D':
        dataType.dataType = 'DATE';
        break;
    }
  }
  
  return { fieldId: field.name, attribute: { name: field.name, alias: field.alias, type: dataType }};
}