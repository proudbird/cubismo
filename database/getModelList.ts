import { Sequelize } from "sequelize";
import Application from "../classes/application/Application";
import { DataBaseModel, Result } from "./types";

type FetchPortion = 'first' | 'next' | 'prev';

export type GetModelListOptions = {
  limit?: number;
  offset?: number;
  orderBy?: string;
  where?: BooleanStatement | ConditionStatement;
  fields?: string;
  cursor?: string;
  portion?: FetchPortion;
}

export interface GetModelListParams {
  cube: string;
  className: string;
  model: string;
  options: GetModelListOptions;
}

export async function getModelList(application: Application, dbDriver: Sequelize, {
  cube,
  className,
  model,
  options
}: GetModelListParams): Promise<Result> {

  const modelAlias = `${cube}.${className}.${model}`;

  const modelDefinition = (dbDriver.models[modelAlias] as unknown as DataBaseModel).definition;

  let [orderByColumnName] = options.orderBy || [];
  orderByColumnName = orderByColumnName || 'id';

  let query: QueryStatement = {} as QueryStatement;

  options.fields = options.fields + ', id';
  let selectedSubqueryFields = options.fields;

  if(options.cursor) {
    if(options.portion === 'first') {
      const beforeLimit = 5;
      const afterLimit = options.limit - beforeLimit - 1;
      query = {
        with: {
          selected: {
            select: selectedSubqueryFields,
            from: modelAlias,
            where: {
              [`${model}.Reference`]: { id: options.cursor }
            },
          }
        },
        select: options.fields || `*`,
        from: modelAlias,
        limit: beforeLimit,
        where: {
          lessOrEqual: [`${model}.${orderByColumnName}`, {
            select: orderByColumnName,
            from: 'selected',
          }],
          notEqual: [`${model}.id`, {
            select: 'id',
            from: 'selected',
          }]
        },
        orderBy: [`${orderByColumnName} DESC`, 'id'],
        unionAll: [
          {
            select: selectedSubqueryFields,
            from: 'selected',
          },
          {
            select: options.fields || `*`,
            from: modelAlias,
            limit: afterLimit,
            where: {
              greater: [`${model}.${orderByColumnName}`, {
                select: orderByColumnName,
                from: 'selected',
              }]
            },
            orderBy: [`${orderByColumnName}`, 'id'],
          }
        ], 
        orderAllBy: [`${orderByColumnName}`],
      }
    } else if(options.portion === 'prev') {
      query = {
        with: {
          selected: {
            select: selectedSubqueryFields,
            from: modelAlias,
            where: {
              [`${model}.Reference`]: { id: options.cursor }
            },
          },
          found: {
            select: options.fields || `*`,
            from: modelAlias,
            limit: options.limit,
            where: {
              less: [`${model}.${orderByColumnName}`, {
                select: orderByColumnName,
                from: 'selected',
              }]
            },
            orderBy: [`${orderByColumnName} DESC`],
          }
        },
        select: options.fields || `*`,
        from: 'found',
        orderBy: [`${orderByColumnName}`, 'id'],
      }
    } else if(options.portion === 'next') {
      query = {
        with: {
          selected: {
            select: selectedSubqueryFields,
            from: modelAlias,
            where: {
              [`${model}.Reference`]: { id: options.cursor }
            },
          }
        },
        select: options.fields || `*`,
        from: modelAlias,
        limit: options.limit,
        where: {
          greater: [`${model}.${orderByColumnName}`, {
            select: `${orderByColumnName}`,
            from: 'selected',
          }]
        },
        orderBy: [`${orderByColumnName}`, 'id'],
      }
    }
  } else {
    query = {
      select: options.fields || `*`, 
      from: modelAlias,
      limit: options.limit,
      offset: options.offset,
      orderBy: [orderByColumnName, 'id'],
    }
  }

  if (options.where) {
    query.where = options.where;
  }

  try {
    const result = await application.Query.execute(query);
    return { error: null, data: result };
  } catch (error) {
    return { error: null, message: error.message };
  }
}
