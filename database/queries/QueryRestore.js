"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _Query_driver, _Query_application;
Object.defineProperty(exports, "__esModule", { value: true });
const QuerySelectItem_1 = __importDefault(require("../QuerySelectItem"));
const QueryError_1 = __importDefault(require("./QueryError"));
const types_1 = require("./types");
const Utils_1 = __importStar(require("../../common/Utils"));
const dataroll_1 = __importDefault(require("dataroll"));
class Query {
    constructor(application, driver) {
        _Query_driver.set(this, void 0);
        _Query_application.set(this, void 0);
        __classPrivateFieldSet(this, _Query_application, application, "f");
        __classPrivateFieldSet(this, _Query_driver, driver, "f");
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
            model = __classPrivateFieldGet(this, _Query_driver, "f").models[options.FROM];
        }
        let queryModel = model;
        if (raw) {
            queryModel = undefined;
        }
        try {
            const select = [];
            const models = __classPrivateFieldGet(this, _Query_driver, "f").models;
            const query = await buildSQLQuery(__classPrivateFieldGet(this, _Query_application, "f"), models, options);
            // writeFileSync('c:\\ITProjects\\cubismo\\workspaces\\optima\\sql.txt', query.sql);
            const matches = /at async (.*) \(.*cubismo\.apps\/cubes\/(.*)\)/.exec((new Error()).stack);
            if (matches) {
                const id = `${matches[1]}_${matches[2]}`.replace('.dist', '').replace(/\//g, '-').replace('.js', '').replace(/\:/g, '-');
                __classPrivateFieldGet(this, _Query_application, "f").fs.writeFileSync(`query-${id}.sql`, query.sql);
            }
            else {
                __classPrivateFieldGet(this, _Query_application, "f").fs.writeFileSync(`last-query.sql`, query.sql);
            }
            const result = await __classPrivateFieldGet(this, _Query_driver, "f").query(query.sql, queryModel);
            if (result && result[0]) {
                const data = result[0];
                //let fieldsMap = query.fieldsMap.
                for (let index in data) {
                    const record = data[index];
                    const selectItem = new QuerySelectItem_1.default(record, query.fieldsMap);
                    select.push(selectItem);
                }
            }
            return select;
        }
        catch (err) {
            throw new Error(err.message);
        }
    }
    async raw(sqlString) {
        const result = await __classPrivateFieldGet(this, _Query_driver, "f").query(sqlString);
        return result;
    }
}
exports.default = Query;
_Query_driver = new WeakMap(), _Query_application = new WeakMap();
function buildSQLQuery(application, models, query) {
    let schema = {
        application,
        fields: new Map,
        additionalfields: new Map,
        from: {},
        joins: {},
        tables: {},
        models: models,
        sources: new Map(),
        tempSources: []
    };
    const sql = buildSQLStatement(query, schema);
    return { sql, fieldsMap: schema.fields };
}
function buildSQLStatement(query, schema, mainSchema) {
    let result;
    defineFrom(query, schema);
    const joins = new Map();
    if (query.joins?.length) {
        for (let join of query.joins) {
            const { statement, joinType } = getJoinStatement(join);
            const joinModel = defineJoinFrom(statement, joinType, schema);
            joins.set(join, { statement, joinType, model: joinModel });
        }
    }
    defineFields(query, schema);
    defineConditions(query.where, undefined, undefined, schema);
    joins.forEach((value, join) => {
        defineJoinFields(value.statement, value.model, schema);
    });
    schema.groupBy = [];
    defineGroupBy(query, schema);
    schema.orderBy = [];
    defineOrderBy(query, schema);
    result = buildSQLQueryString(schema);
    return result;
}
function getJoinStatement(join) {
    const typeMap = new Map([
        ['innerJoin', types_1.JoinType.INNER],
        ['leftJoin', types_1.JoinType.LEFT],
        ['rightJoin', types_1.JoinType.RIGHT],
        ['fullJoin', types_1.JoinType.FULL],
    ]);
    let statement;
    let joinType;
    for (let key of Object.getOwnPropertyNames(join)) {
        statement = join[key];
        joinType = typeMap.get(key);
        if (!joinType) {
            throw new Error(`Wrong join statement '${key}'`);
        }
    }
    return { statement, joinType };
}
function defineFrom(query, schema) {
    const from = getFrom(query, schema);
    schema.from = {
        name: from.name,
        alias: from.alias,
        tableId: from.model.definition.tableId,
        model: from.model
    };
    schema.tables[from.model.definition.tableId] = from;
    schema.sources.set(from.alias, from);
}
function defineJoinFrom(query, joinType, schema) {
    const joinFrom = getFrom(query, schema);
    const joinTables = addJoin(joinFrom.model, joinType, schema, query);
    for (let joinTableId in joinTables) {
        const joinTable = joinTables[joinTableId];
        if (joinTable.model.modelName !== joinFrom.model.modelName) {
            addSubQueryAttributes(joinFrom.model, joinTable.model);
        }
    }
    return joinFrom.model;
}
function getFrom(query, schema) {
    let name;
    let alias;
    let fromModel;
    if (typeof query.from === 'string') {
        const statement = getNameAndAlias(query.from);
        name = statement.name;
        alias = statement.alias;
        fromModel = schema.models[name];
        if (!fromModel) {
            throw new QueryError_1.default(`Can not find sourse table '${name}', described in 'FROM' clause`);
        }
    }
    else if (isSubquery(query.from)) {
        if (query.from?.from instanceof dataroll_1.default
            || (Array.isArray(query.from?.from) && query.from?.from[0] instanceof dataroll_1.default)) {
            const from = query.from['from'];
            let childSchema = {
                application: schema.application,
                fields: new Map,
                additionalfields: new Map,
                from: {},
                joins: {},
                tables: {},
                models: schema.models,
                sources: new Map()
            };
            childSchema.mainSchema = schema.mainSchema || schema;
            childSchema.alias = query.from['as'];
            schema.childSchema = childSchema;
            //@ts-ignore
            const sql = buildSQLStatement(query.from, childSchema);
            const dataSource = (from || from[0])[0];
            const tableId = 'temp_' + (0, Utils_1.sid)();
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
            };
            schema.models[childSchema.alias] = fromModel;
            schema.tables[tableId] = { name: alias, alias: query.from['as'], tableId: tableId };
        }
        else if (typeof query.from?.from === 'string') {
            const statement = getNameAndAlias(query.from?.from);
            name = statement.name;
            alias = statement.alias;
            fromModel = schema.models[name];
            if (!fromModel) {
                throw new QueryError_1.default(`Can not find sourse table '${name}', described in 'FROM' clause`);
            }
            let childSchema = {
                application: schema.application,
                fields: new Map,
                additionalfields: new Map,
                from: {},
                joins: {},
                tables: {},
                models: schema.models,
                sources: new Map()
            };
            childSchema.mainSchema = schema.mainSchema || schema;
            childSchema.alias = query.from['as'];
            schema.childSchema = childSchema;
            //@ts-ignore
            const sql = buildSQLStatement(query.from, childSchema);
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
            };
            schema.models[childSchema.alias] = fromModel;
            //schema.tables[fromModel.tableName] = { name: alias, alias: query.from['as'], tableId: fromModel.tableName };
        }
        else {
            throw new Error(`Subquering from subqueries not implemented`);
        }
    }
    else if (query.from instanceof dataroll_1.default || (Array.isArray(query.from) && query.from[0] instanceof dataroll_1.default)) {
        const tableId = 'temp_' + (0, Utils_1.sid)();
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
        };
        schema.models[alias] = fromModel;
        schema.mainSchema = schema.mainSchema || schema;
        schema.mainSchema.tempSources.push(fromModel);
        const tableDefinition = { name: alias, alias, tableId: tableId };
        schema.tables[alias] = tableDefinition;
        schema.tables[tableId] = tableDefinition;
    }
    return getSourceDefinition(fromModel, alias);
}
function defineDataTableAttributes(source) {
    const attributes = {};
    for (let columnDescriptor of source.columns) {
        attributes[columnDescriptor.name] = {
            fieldId: columnDescriptor.name,
            type: {
                dataType: columnDescriptor.dataType,
                length: columnDescriptor.length,
                scale: columnDescriptor.scale
            }
        };
    }
    return attributes;
}
function addSubQueryAttributes(source, target) {
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
        };
    }
    if (source.definition.codeLenght) {
        target.definition.joinedAttributes['Code'] = {
            fieldId: 'Code',
            type: {
                dataType: source.definition.codeType,
                length: source.definition.codeLenght
            }
        };
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
        };
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
        };
    }
}
function getDataTableAttributeType(type) {
    const map = {
        'S': 'STRING',
        'N': 'NUMBER',
        'B': 'BOOLEAN',
        'D': 'DATE'
    };
    return map[type];
}
function isSubquery(query) {
    let result = false;
    // we just check whether query 'from' property has properties, wich determin it as a Query Statement
    if (query.select && query.from) {
        result = true;
    }
    return result;
}
function defineFields(query, schema) {
    if (!query.select) {
        return;
    }
    if (query.select === '*') {
        return defineAllFields(schema);
    }
    const selectFields = query.select.split(',');
    for (let fieldStatement of selectFields) {
        fieldStatement = fieldStatement.trim();
        if (fieldStatement) {
            defineField(fieldStatement, schema);
        }
    }
}
function defineAllFields(schema) {
    const definition = schema.from.model.definition;
    if (definition.class) {
        defineField('Reference', schema);
    }
    if (definition.nameLenght) {
        defineField('Name', schema);
    }
    if (definition.codeLenght) {
        defineField('Code', schema);
    }
    if (definition.multilevel) {
        defineField('Parent', schema);
    }
    for (let attributeName in definition.attributes) {
        defineField(attributeName, schema);
    }
    if (schema.childSchema) {
        schema.childSchema.fields.forEach(field => {
            const additionalFiels = { ...field };
            //if(!schema.fields.get(field.alias)) {
            additionalFiels.alias = field.alias;
            additionalFiels.fieldId = field.alias;
            additionalFiels.tableId = schema.childSchema.alias;
            schema.additionalfields.set(additionalFiels.alias, additionalFiels);
            //}
        });
    }
}
function defineJoinFields(query, joinModel, schema) {
    if (!query.select) {
        return;
    }
    if (query.select === '*') {
        if (joinModel.sql) {
            return defineAllJoinFieldsFromSubQuery(schema.childSchema.fields, schema.childSchema, query);
        }
        else {
            return defineAllJoinFields(joinModel, schema, query);
        }
    }
    const selectFields = query.select.split(',');
    for (let fieldStatement of selectFields) {
        fieldStatement = fieldStatement.trim();
        if (fieldStatement) {
            if (joinModel.sql) {
                defineJoinFieldFromSubQuery(fieldStatement, schema.childSchema, query);
            }
            else {
                defineJoinField(fieldStatement, joinModel, schema, query);
            }
        }
    }
}
function defineGroupBy(query, schema) {
    if (query.groupBy && Array.isArray(query.groupBy)) {
        let model = schema.from.model;
        let tableAlias;
        for (let fieldId of query.groupBy) {
            if (fieldId.includes('.')) {
                const parts = fieldId.split('.');
                const modelAlias = parts[0];
                model = schema.models[modelAlias] || schema.sources.get(modelAlias);
                fieldId = parts[1];
            }
            if (!model.dataSource) {
                const lang = model.model.application.lang;
                let modelDefinition = model.model.definition;
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
                }
                else if (fieldName === 'id') {
                    fieldId = 'id';
                }
                else if (fieldName === 'Reference') {
                    fieldId = 'id';
                }
                else if (fieldName === 'Code') {
                }
                else if (fieldName === 'Parent') {
                    fieldId = 'parentId';
                }
                else if (fieldName === 'Owner') {
                    fieldId = 'ownerId';
                }
                else if (fieldName === 'order') {
                    fieldId = 'order';
                }
                else {
                    const attribute = modelDefinition.attributes[fieldName];
                    if (!attribute) {
                        throw new QueryError_1.default(`Can not find attribute '${fieldName}' in ${model.name}`);
                    }
                    else {
                        if (attribute.type.lang && attribute.type.lang.length) {
                            fieldId = attribute.fieldId + '_' + lang;
                        }
                        else {
                            fieldId = attribute.fieldId;
                        }
                    }
                }
            }
            if (model.alias) {
                schema.groupBy.push(`${tableAlias || model.alias}."${fieldId}"`);
            }
            else {
                schema.groupBy.push(`${model.modelName}.${fieldId}`);
            }
        }
    }
}
function defineOrderBy(query, schema) {
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
            }
            else {
                const lang = model.application.lang;
                const modelDefinition = model.definition;
                if (fieldName === 'Name') {
                    if (modelDefinition.nameLang && modelDefinition.nameLang.length) {
                        fieldId = fieldId + '_' + lang;
                    }
                }
                else if (fieldName === 'id') {
                    fieldId = 'id';
                }
                else if (fieldName === 'Reference') {
                    fieldId = 'id';
                }
                else if (fieldName === 'Code') {
                }
                else if (fieldName === 'Date') {
                }
                else if (fieldName === 'Order') {
                    fieldId = 'order';
                }
                else if (fieldName === 'Parent') {
                    fieldId = 'parentId';
                }
                else if (fieldName === 'Owner') {
                    fieldId = 'ownerId';
                }
                else if (fieldName === 'order') {
                    fieldId = 'order';
                }
                else {
                    const attribute = modelDefinition.attributes[fieldName];
                    if (!attribute) {
                        throw new QueryError_1.default(`Can not find attribute '${fieldName}' in ${model.name}`);
                    }
                    if (attribute.type.lang && attribute.type.lang.length) {
                        fieldId = attribute.fieldId + '_' + lang;
                    }
                    else {
                        fieldId = attribute.fieldId;
                    }
                }
            }
            schema.orderBy.push(`${schema.from.alias}."${fieldId}" ${direction}`);
        }
    }
}
function defineField(fieldStatement, schema) {
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
        determineReferenceJoins(name, alias, schema, func);
    }
    else {
        addFieldDefinition(name, alias, schema.from.model, schema, func);
    }
}
function defineJoinField(fieldStatement, joinModel, schema, query) {
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
        determineJoins(name, alias, schema, query);
    }
    else {
        addFieldDefinition(name, alias, joinModel, schema, func);
    }
}
function defineJoinFieldFromSubQuery(fieldStatement, schema, query) {
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
    }
    else {
        const fieldDefinition = schema.fields.get(name.toLocaleLowerCase());
        if (fieldDefinition) {
            addFieldDefinitionFromSubQuery(fieldDefinition, schema, func);
        }
        else {
            throw new Error(`Can't find field definition for '${name}' field`);
        }
    }
}
function defineAllJoinFields(joinModel, schema, query) {
    const definition = joinModel.definition;
    if (definition.nameLenght) {
        addFieldDefinition('Name', 'Name', joinModel, schema);
    }
    if (definition.codeLenght) {
        addFieldDefinition('Code', 'Code', joinModel, schema);
    }
    if (definition.multilevel) {
        addFieldDefinition('Parent', 'Parent', joinModel, schema);
    }
    for (let attributeName in definition.attributes) {
        addFieldDefinition(attributeName, attributeName, joinModel, schema);
    }
}
function defineAllJoinFieldsFromSubQuery(fields, schema, query) {
    for (let [_, fieldDefinition] of fields.entries()) {
        addFieldDefinitionFromSubQuery(fieldDefinition, schema);
    }
}
function addFieldDefinition(fieldName, alias, model, schema, func, noRef) {
    alias = alias || fieldName;
    let fieldId = fieldName;
    let dataType;
    let length;
    let scale;
    const lang = model.application.lang;
    const modelDefinition = model.definition;
    let referenceModelId = modelDefinition.id;
    if (fieldName === 'Name') {
        if (modelDefinition.nameLang && modelDefinition.nameLang.length) {
            fieldId = fieldId + '_' + lang;
        }
        dataType = 'STRING';
    }
    else if (fieldName === 'id') {
        fieldId = 'id';
        dataType = 'STRING ';
    }
    else if (fieldName === 'Reference') {
        fieldId = 'id';
        dataType = 'FK';
    }
    else if (fieldName === 'Code') {
        dataType = modelDefinition.codeType;
    }
    else if (fieldName === 'Date') {
        dataType = 'DATE';
    }
    else if (fieldName === 'Parent') {
        fieldId = 'parentId';
        dataType = 'FK';
    }
    else if (fieldName === 'Owner') {
        fieldId = 'ownerId';
        dataType = 'FK';
        referenceModelId = modelDefinition.owners[0];
    }
    else if (fieldName === 'order') {
        fieldId = 'order';
        dataType = 'NUMBER';
    }
    else if (fieldName === 'Registrator') {
        fieldId = 'ownerId';
        dataType = 'FK';
        referenceModelId = modelDefinition.owners[0];
    }
    else if (fieldName === 'Updated') {
        fieldId = 'updatedAt';
        dataType = 'DATE';
    }
    else {
        const attribute = modelDefinition.attributes[fieldName];
        if (!attribute) {
            throw new QueryError_1.default(`Can not find attribute '${fieldName}' in ${model.name}`);
        }
        dataType = attribute.type.dataType;
        length = attribute.type.length;
        scale = attribute.type.scale;
        if (attribute.type.lang && attribute.type.lang.length) {
            fieldId = attribute.fieldId + '_' + lang;
        }
        else {
            fieldId = attribute.fieldId;
            if (attribute.type.dataType === 'FK') {
                if (!noRef) {
                    referenceModelId = attribute.type.reference.modelId;
                }
                else {
                    dataType = 'STRING ';
                }
            }
        }
    }
    const fieldDefinition = {
        name: fieldName,
        alias,
        tableId: modelDefinition.tableId,
        model: schema.models[referenceModelId],
        fieldId,
        dataType,
        length,
        scale,
        func
    };
    schema.fields.set(alias.toLocaleLowerCase(), fieldDefinition);
}
function addFieldDefinitionFromSubQuery(field, schema, func) {
    const alias = field.alias;
    const fieldDefinition = {
        name: alias,
        alias: alias,
        tableId: schema.alias,
        model: undefined,
        fieldId: alias,
        dataType: undefined,
        length: undefined,
        scale: undefined,
        func: func
    };
    schema.mainSchema.fields.set(alias.toLocaleLowerCase(), fieldDefinition);
}
function getNameAndAlias(sourceStatement) {
    const statement = sourceStatement.replace(' as ', ' AS ').split(' AS ');
    let name = statement[0];
    let alias;
    if (statement.length > 1) {
        alias = statement[1];
    }
    return { name, alias };
}
function determineReferenceJoins(fieldName, alias, schema, func) {
    const track = fieldName.split('.');
    if (track.length && track[1] === 'id') {
        alias = alias || track.join();
        return addFieldDefinition(track[0], alias, schema.from.model, schema, func, true);
    }
    let mainModel = schema.from.model;
    let parentField;
    for (let i = 0; i < track.length - 1; i++) {
        const attributeName = track[i];
        const result = addReferenceJoin(attributeName, fieldName, mainModel, schema, i + 1, track.length, parentField);
        mainModel = result.mainModel;
        parentField = result.parentField;
    }
    const attributeName = track[track.length - 1];
    addFieldDefinition(attributeName, alias, mainModel, schema, func);
}
function determineJoins(fieldName, alias, schema, query) {
    const track = fieldName.split('.');
    const joinFrom = getFrom(query, schema);
    let mainModel = joinFrom.model;
    let parentField;
    for (let i = 0; i < track.length - 1; i++) {
        const attributeName = track[i];
        const result = addReferenceJoin(attributeName, fieldName, mainModel, schema, i + 1, track.length, parentField);
        mainModel = result.mainModel;
        parentField = result.parentField;
    }
    const attributeName = track[track.length - 1];
    addFieldDefinition(attributeName, alias, mainModel, schema);
}
function addReferenceJoin(attributeName, fieldName, mainModel, schema, level, trackLength, parentField) {
    const modelDefinition = mainModel.definition;
    let attribute;
    let referenceModelId;
    let referenceModel;
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
        };
    }
    else if (fieldName === 'Reference') {
        referenceModelId = modelDefinition.id;
        attribute = {
            fieldId: 'id',
            type: {
                dataType: 'FK',
                reference: {
                    modelId: referenceModelId
                }
            }
        };
    }
    else if (fieldName === 'Code') {
        referenceModelId = modelDefinition.id;
        attribute = {
            fieldId: 'Code',
            type: {
                dataType: 'STRING',
                reference: {
                    modelId: referenceModelId
                }
            }
        };
    }
    else if (attributeName === 'Owner') {
        referenceModelId = modelDefinition.owners[0];
        attribute = {
            fieldId: 'ownerId',
            type: {
                dataType: 'FK',
                reference: {
                    modelId: referenceModelId
                }
            }
        };
    }
    else if (attributeName === 'order') {
        referenceModelId = modelDefinition.id;
        attribute = {
            fieldId: 'order',
            type: {
                dataType: 'NUMBER',
                reference: {
                    modelId: referenceModelId
                }
            }
        };
    }
    else if (attributeName === 'Parent') {
        referenceModelId = modelDefinition.id;
        attribute = {
            fieldId: 'parentId',
            type: {
                dataType: 'FK',
                reference: {
                    modelId: referenceModelId
                }
            }
        };
    }
    else {
        attribute = modelDefinition.attributes[attributeName];
        if (!attribute) {
            throw new QueryError_1.default(`Can not find attribute '${attributeName}' in ${mainModel.name}`);
        }
        if (level < trackLength && attribute.type.dataType !== 'FK') {
            throw new QueryError_1.default(`Attribute '${attributeName}' in reference field '${fieldName}' is not a reference. It is a type of '${attribute.type.dataType}'`);
        }
        referenceModelId = attribute.type.reference.modelId;
    }
    referenceModel = schema.models[referenceModelId];
    if (!referenceModel) {
        throw new QueryError_1.default(`Can not find sourse table with ID '${referenceModelId}' as reference table, described id fielad '${fieldName}'`);
    }
    let leftTableAlias = 'l_' + (0, Utils_1.sid)();
    let leftTableDefinition = schema.tables[mainModel.definition.tableId];
    if (leftTableDefinition) {
        leftTableAlias = leftTableDefinition.alias;
    }
    let rigthTableAlias = 'r_' + (0, Utils_1.sid)();
    let rigthTableDefinition = schema.tables[referenceModel.definition.tableId];
    if (rigthTableDefinition) {
        rigthTableAlias = rigthTableDefinition.alias;
    }
    const leftTable = getSourceDefinition(mainModel, leftTableAlias);
    const rigthTable = getSourceDefinition(referenceModel, rigthTableAlias);
    const leftTableReferenceField = {
        name: attributeName,
        alias: parentField ? parentField.alias + attributeName : attributeName,
        tableId: mainModel.definition.tableId,
        model: schema.models[attribute.type.reference.modelId],
        fieldId: attribute.fieldId,
        dataType: attribute.type.dataType
    };
    if (level === trackLength) {
        schema.fields.set(leftTableReferenceField.alias.toLocaleLowerCase(), leftTableReferenceField);
    }
    const rigthTableReferenceField = {
        name: 'id',
        tableId: referenceModel.definition.tableId,
        model: referenceModel,
        fieldId: 'id',
        dataType: 'FK'
    };
    leftTable.on = leftTableReferenceField;
    rigthTable.on = rigthTableReferenceField;
    if (!schema.joins[mainModel.modelName]) {
        schema.joins[mainModel.modelName] = [];
    }
    if (!(leftTableDefinition && rigthTableDefinition)) {
        // add join to schema only if it is uniq
        schema.joins[mainModel.modelName].push({
            joinType: types_1.JoinType.LEFT,
            leftTable,
            rigthTable
        });
    }
    schema.tables[leftTable.tableId] = leftTable;
    schema.tables[rigthTable.tableId] = rigthTable;
    schema.sources.set(leftTable.alias, leftTable);
    schema.sources.set(rigthTable.alias, rigthTable);
    return { mainModel: referenceModel, parentField: leftTableReferenceField };
}
function getAttributeDefinition(attributeName, model, schema) {
    const modelDefinition = model.definition;
    let attribute;
    let referenceModelId;
    let referenceModel;
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
        };
    }
    else if (attributeName === 'Reference') {
        referenceModelId = modelDefinition.id;
        attribute = {
            fieldId: 'id',
            type: {
                dataType: 'FK',
                reference: {
                    modelId: referenceModelId
                }
            }
        };
    }
    else if (attributeName === 'Code') {
        referenceModelId = modelDefinition.id;
        attribute = {
            fieldId: 'Code',
            type: {
                dataType: 'STRING',
                reference: {
                    modelId: referenceModelId
                }
            }
        };
    }
    else if (attributeName === 'Reference') {
        referenceModelId = modelDefinition.id;
        attribute = {
            fieldId: 'id',
            type: {
                dataType: 'FK',
                reference: {
                    modelId: referenceModelId
                }
            }
        };
    }
    else if (attributeName === 'Owner') {
        referenceModelId = modelDefinition.owners[0];
        attribute = {
            fieldId: 'ownerId',
            type: {
                dataType: 'FK',
                reference: {
                    modelId: referenceModelId
                }
            }
        };
    }
    else if (attributeName === 'Registrator') {
        referenceModelId = modelDefinition.ownerModel.definition.id;
        attribute = {
            fieldId: 'ownerId',
            type: {
                dataType: 'FK',
                reference: {
                    modelId: referenceModelId
                }
            }
        };
    }
    else if (attributeName === 'Parent') {
        referenceModelId = modelDefinition.id;
        attribute = {
            fieldId: 'parentId',
            type: {
                dataType: 'FK',
                reference: {
                    modelId: referenceModelId
                }
            }
        };
    }
    else if (attributeName === 'Updated') {
        referenceModelId = modelDefinition.id;
        attribute = {
            fieldId: 'updatedAt',
            type: {
                dataType: 'DATE',
                reference: {
                    modelId: referenceModelId
                }
            }
        };
    }
    else if (attributeName === 'order') {
        referenceModelId = modelDefinition.id;
        attribute = {
            fieldId: 'order',
            type: {
                dataType: 'NUMBER',
                reference: {
                    modelId: referenceModelId
                }
            }
        };
    }
    else {
        attribute = modelDefinition.attributes[attributeName];
        if (!attribute) {
            throw new QueryError_1.default(`Can not find attribute '${attributeName}' in ${model.name}`);
        }
        if (attribute.type.dataType === 'FK') {
            referenceModelId = attribute.type.reference.modelId;
            referenceModel = schema.models[referenceModelId];
            if (!referenceModel) {
                throw new QueryError_1.default(`Can not find sourse table with ID '${referenceModelId}' as reference table, described id field '${attributeName}'`);
            }
        }
    }
    return { dataType: attribute.type.dataType, fieldId: attribute.fieldId, referenceModel };
}
function addJoin(rigthModel, joinType, schema, query) {
    const onLeftTrack = query.on[0].split('.');
    const leftModelAlias = onLeftTrack[0];
    const onRigthTrack = query.on[1].split('.');
    const rigthModelAlias = onRigthTrack[0];
    const onRigthFieldName = onRigthTrack[1];
    const leftSource = { ...schema.sources.get(leftModelAlias) };
    const leftModel = leftSource.model;
    if (!leftModel) {
        throw new QueryError_1.default(`Can not find sourse table with alias '${leftModelAlias}' as reference table`);
    }
    const leftTable = leftSource;
    let rigthTable;
    if (rigthModel.sql) {
        const model = schema.models[rigthModelAlias];
        rigthTable = getSourceDefinition(model, rigthModelAlias);
    }
    else {
        rigthTable = getSourceDefinition(rigthModel, rigthModelAlias);
    }
    const onLeftFieldName = onLeftTrack[1];
    const leftOnField = getAttributeDefinition(onLeftFieldName, leftModel, schema);
    const leftTableReferenceField = {
        name: onLeftFieldName,
        tableId: leftModel.definition.tableId,
        model: leftOnField.referenceModel,
        fieldId: leftOnField.fieldId,
        dataType: leftOnField.dataType
    };
    let rigthOnField;
    let tableId;
    if (rigthModel.sql) {
        rigthOnField = schema.childSchema.fields.get(onRigthFieldName.toLocaleLowerCase());
        tableId = schema.childSchema.alias;
        rigthTable.tableId = tableId;
    }
    else {
        rigthOnField = getAttributeDefinition(onRigthFieldName, rigthModel, schema);
        tableId = rigthModel.definition.tableId;
    }
    const rigthTableReferenceField = {
        name: onRigthFieldName,
        tableId: tableId,
        model: rigthOnField.referenceModel,
        fieldId: rigthOnField.fieldId,
        dataType: rigthOnField.dataType
    };
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
function getSourceDefinition(model, alias) {
    return {
        name: model.modelName,
        alias: alias || model.modelName.replace(/\./g, ''),
        tableId: model.tableName,
        model: model
    };
}
function buildSQLQueryString(schema) {
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
    function wrapIfFunc(input, func, cast) {
        let result = input;
        if (func) {
            result = `${func}(${input}${cast || ''})`;
        }
        return result;
    }
    schema.fields.forEach((fieldDefinition) => {
        const tableId = fieldDefinition.tableId;
        const tableDefinition = schema.tables[tableId];
        const tableAlias = tableDefinition.alias;
        if ((fieldDefinition.model && fieldDefinition.model.dataSource) || !fieldDefinition.model) {
            fields.push(`${wrapIfFunc(`${tableAlias}.${fieldDefinition.fieldId}`, fieldDefinition.func)} AS ${fieldDefinition.alias}`);
        }
        else {
            let cast = '';
            if (fieldDefinition.dataType === 'FK') {
                cast = '::varchar';
            }
            fields.push(`${wrapIfFunc(`${tableAlias}."${fieldDefinition.fieldId}"`, fieldDefinition.func, cast)} AS ${fieldDefinition.alias}`);
        }
    });
    schema.additionalfields.forEach((fieldDefinition) => {
        if (!schema.fields.get(fieldDefinition.alias.toLocaleLowerCase())) {
            const tableId = fieldDefinition.tableId;
            const tableDefinition = schema.tables[tableId];
            const tableAlias = tableDefinition.alias;
            fields.push(`${tableAlias}.${fieldDefinition.fieldId} AS ${fieldDefinition.alias}`);
            schema.fields.set(fieldDefinition.alias.toLocaleLowerCase(), fieldDefinition);
        }
    });
    result = result + `SELECT ${fields.join(', ')} `;
    if (schema.from.model.dataSource) {
        result += ` FROM ${schema.from.tableId} ${schema.from.alias} `; // if table created dynamically we don't need brackets
    }
    else if (schema.from.model.sql) {
        result += ` FROM "(${schema.from.model.sql})" ${schema.from.alias} `;
    }
    else {
        result += ` FROM "${schema.from.tableId}" ${schema.from.alias} `;
    }
    for (let key in schema.joins) {
        const joins = schema.joins[key];
        for (let join of joins) {
            if (join.rigthTable.model.sql) {
                result += `${join.joinType} (${join.rigthTable.model.sql}) ${join.rigthTable.alias} `;
            }
            else if (join.rigthTable.model.dataSource) {
                result += `${join.joinType} ${join.rigthTable.tableId} ${join.rigthTable.alias} `;
            }
            else {
                result += `${join.joinType} "${join.rigthTable.tableId}" ${join.rigthTable.alias} `;
            }
            let leftCast = '';
            let rigthCast = '';
            let quoteL = '"';
            let quoteR = '"';
            if ((join.leftTable.on.dataType === 'FK' || join.leftTable.on.dataType === 'ENUM') && join.rigthTable.on.dataType !== 'FK' && join.rigthTable.on.dataType !== 'ENUM') {
                leftCast = '::"varchar"';
            }
            else if ((join.rigthTable.on.dataType === 'FK' || join.rigthTable.on.dataType === 'ENUM') && join.leftTable.on.dataType !== 'FK' && join.leftTable.on.dataType !== 'ENUM') {
                rigthCast = '::"varchar"';
            }
            if (join.leftTable.model.dataSource) {
                quoteL = '';
            }
            if (join.rigthTable.model.dataSource) {
                quoteR = '';
            }
            let leftTableOnFieldId = join.leftTable.on.fieldId;
            if (join.leftTable.model.sql) {
                leftTableOnFieldId = join.leftTable.on.name;
            }
            let rigthTableOnFieldId = join.rigthTable.on.fieldId;
            if (join.rigthTable.model.sql) {
                rigthTableOnFieldId = join.rigthTable.on.name;
            }
            result += `ON ${join.leftTable.alias}.${quoteL + leftTableOnFieldId + quoteL + leftCast} = ${join.rigthTable.alias}.${quoteR + rigthTableOnFieldId + quoteR + rigthCast} `;
        }
    }
    if (schema.where) {
        result += ` WHERE ${buildWhereClause(schema)}`;
    }
    if (schema.groupBy?.length) {
        result += ` GROUP BY ${schema.groupBy.join(', ')}`;
    }
    if (schema.orderBy?.length) {
        result += ` ORDER BY ${schema.orderBy.join(', ')}`;
    }
    return result;
}
function describeColumns(attributes) {
    const columns = [];
    for (let attributeName in attributes) {
        const field = attributes[attributeName];
        columns.push(describeColumn(field));
    }
    return columns;
}
function describeColumn(field) {
    let definition;
    const type = describeType(field);
    definition = `${field.fieldId} ${type}`;
    return definition;
}
function describeType(field) {
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
function defineInsertions(fields, source) {
    const insertions = [];
    for (let entry of source) {
        const values = defineValues(fields, entry);
        insertions.push(`(${values.join(', ')})`);
    }
    ;
    return insertions;
}
function defineValues(fields, entry) {
    const values = [];
    for (let fieldName in fields) {
        const field = fields[fieldName];
        const value = adoptValue(Utils_1.default.get(entry, field.fieldId), field.type.dataType);
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
    }
    ;
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
function buildWhereClause(schema) {
    let result = [];
    const conditions = schema.where.conditions;
    for (let index in conditions) {
        const condition = conditions[index];
        result.push(buildOperation(condition));
    }
    return result.join(` ${schema.where.type} `);
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
    'IS NULL': buildOperationIsNull,
    'IS NOT NULL': buildOperationIsNotNull,
    'IS TRUE': buildOperationBoolean,
    'IS FALSE': buildOperationBoolean
};
function getComperisonValue(condition) {
    let result;
    let value = condition.etalon.value;
    if (condition.etalon.isSubQuery) {
        result = `(${buildSQLQueryString(value)})`;
    }
    else {
        value = condition.etalon.value[0];
        result = `${value}`;
        if (condition.field.dataType === 'FK') {
            if (Array.isArray(value)) {
                result = getComperisonValueFromCollection(value);
            }
            else {
                result = `'${value.id}'`;
            }
        }
        else {
            if (typeof value === 'string') {
                result = `'${value}'`;
            }
            else if (Utils_1.default.isDate(value)) {
                result = `'${value.toISOString()}'`;
            }
            else if (Array.isArray(value)) {
                let values = [];
                for (let val of value) {
                    values.push(`'${val}'`);
                }
                result = values.join(", ");
            }
        }
    }
    return result;
}
function getComperisonValueFromCollection(values) {
    let result = [];
    for (let value of values) {
        result.push(`'${value.id}'`);
    }
    return result.join(", ");
}
function buildOperationComparison(condition) {
    let result = `${condition.field.tableAlias}."${condition.field.fieldId}" ${condition.operation} ${getComperisonValue(condition)}`;
    return result;
}
function buildOperationBetween(condition) {
    let result = `${condition.field.tableAlias}."${condition.field.fieldId}" ${condition.operation} ${condition.etalon.value[0]} AND ${condition.etalon.value[1]})`;
    return result;
}
function buildOperationBoolean(condition) {
    let result = `${condition.field.tableAlias}."${condition.field.fieldId}" ${condition.operation}`;
    return result;
}
function buildOperationIn(condition) {
    let result = `${condition.field.tableAlias}."${condition.field.fieldId}" ${condition.operation} (${getComperisonValue(condition)})`;
    return result;
}
function buildOperationIsNull(condition) {
    let result = `${condition.field.tableAlias}."${condition.field.fieldId}" IS NULL`;
    return result;
}
function buildOperationIsNotNull(condition) {
    let result = `${condition.field.tableAlias}."${condition.field.fieldId}" IS NOT NULL`;
    return result;
}
function buildOperation(condition) {
    let result = [];
    if (condition['type']) { // Bitwise condition
        if (condition['type'].type) { // Bitwise subcondition
            result.push(buildOperation(condition));
        }
        else {
            const subConditions = condition.conditions;
            for (let subCondition of subConditions) {
                const operationBuilder = operationBuilders[subCondition.operation];
                result.push(operationBuilder(subCondition));
            }
        }
    }
    else {
        const operationBuilder = operationBuilders[condition.operation];
        result.push(operationBuilder(condition));
    }
    return `(` + result.join(` ${condition.type} `) + `)`;
}
const BitwiseOperators = {
    and: types_1.BitwiseOperatorType.AND,
    or: types_1.BitwiseOperatorType.OR,
    not: types_1.BitwiseOperatorType.NOT
};
const ComparisonOperators = {
    equal: types_1.ComparisonOperatorType.EQUAL,
    greater: types_1.ComparisonOperatorType.GREATER,
    less: types_1.ComparisonOperatorType.LESS,
    greaterOrEqual: types_1.ComparisonOperatorType.GREATER_OR_EQUAL,
    lessOrEqual: types_1.ComparisonOperatorType.LESS_OR_EQUAL,
    notEqual: types_1.ComparisonOperatorType.NOT_EQUAL,
    between: types_1.ComparisonOperatorType.BEETWEN,
    like: types_1.ComparisonOperatorType.LIKE,
    in: types_1.ComparisonOperatorType.IN,
    isNull: types_1.ComparisonOperatorType.IS_NULL
};
function defineConditions(where, condition, parentConditionBlock, schema) {
    if (where) {
        // it doesn't metter whether we have only one condition or several ones - we
        // wrap it in AND operator block
        if (!schema.where) {
            schema.where = { type: types_1.BitwiseOperatorType.AND, conditions: [] };
            parentConditionBlock = schema.where.conditions;
        }
        if (!Array.isArray(where)) {
            where = [where];
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
                    }
                    else {
                        operation = condition[operator];
                        filterFieldName = operation[0];
                        filterFieldNameTrack = filterFieldName.split('.');
                        comparisonValue = operation.splice(1, operation.length - 1);
                    }
                    const modelAlias = filterFieldNameTrack[0];
                    const source = schema.sources.get(modelAlias);
                    if (!source) {
                        throw new Error(`Can not find source with alias '${modelAlias}' for condition '${filterFieldName}'`);
                    }
                    let mainModel = source.model;
                    const depth = filterFieldNameTrack.length;
                    //for(let i = 0; i < depth; i++) {
                    const filterField = filterFieldNameTrack[1];
                    const level = 2;
                    const conditionDefinition = addCondition(filterField, filterFieldNameTrack, comparisonValue, operator, level, depth, mainModel, schema);
                    parentConditionBlock.push(conditionDefinition);
                    //}
                }
                else { // it is a bitwise set
                    for (let index in condition[operator]) {
                        const subCondition = condition[operator][index];
                        parentConditionBlock.conditions = { type: BitwiseOperators[operator], conditions: [] };
                        ({ where, condition, parentConditionBlock, schema } = defineConditions(where, subCondition, parentConditionBlock, schema));
                    }
                }
            }
        }
    }
    return { where, condition, parentConditionBlock, schema };
}
function addCondition(filterField, filterFieldTrack, comparisonValue, operator, level, depth, mainModel, schema) {
    let fieldDefinition;
    let conditionDefinition;
    let fieldId;
    let dataType;
    let referenceModel;
    let tableAlias;
    ({ fieldId, dataType, referenceModel } = getAttributeDefinition(filterField, mainModel, schema));
    if (level < depth) {
        if (filterField === 'Registrator') {
            fieldId = 'ownerId';
        }
        const subConditionDefinition = addCondition(filterFieldTrack[level], filterFieldTrack, comparisonValue, operator, level + 1, depth, referenceModel, schema);
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
        const subQuerySchema = {
            application: schema.application,
            fields: new Map([['id', fieldDefinition]]),
            additionalfields: new Map(),
            from: subQuerySourceDefinition,
            tables: { [subQuerySourceDefinition.tableId]: subQuerySourceDefinition },
            models: schema.models,
            sources: new Map([[subQuerySourceDefinition.alias, subQuerySourceDefinition]]),
            where: { type: types_1.BitwiseOperatorType.AND, conditions: [subConditionDefinition] }
        };
        conditionDefinition = {
            field: fieldDefinition,
            etalon: { value: subQuerySchema, isSubQuery: true },
            operation: ComparisonOperators['in']
        };
    }
    else {
        const tableId = mainModel.definition.tableId;
        let sourceDefinition = schema.tables[tableId];
        if (!sourceDefinition) {
            sourceDefinition = getSourceDefinition(mainModel);
            schema.tables[sourceDefinition.tableId] = sourceDefinition;
            schema.tables[sourceDefinition.alias] = sourceDefinition;
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
        };
    }
    return conditionDefinition;
}
//# sourceMappingURL=Query.js.map