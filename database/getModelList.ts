import Application from "../classes/application/Application";
import { Result } from "./types";

export type GetModelListOptions = {
  limit?: number;
  offset?: number;
  order?: string;
  where?: string;
  fields?: string;
}

export interface GetModelListParams {
  cube: string;
  className: string;
  object: string;
  options: GetModelListOptions;
}

export async function getModelList(application: Application, {
  cube,
  className,
  object,
  options
}: GetModelListParams): Promise<Result> {

  const modelAlias = `${cube}.${className}.${object}`;

  const query: QueryStatement = {
    select: `*`,
    from: modelAlias,
    limit: options.limit,
    offset: options.offset,
  }

  try {
    const result = await application.Query.execute(query);
    return { error: null, data: result };
  } catch (error) {
    return { error: null, message: error.message };
  }
}
