import { Sequelize } from "sequelize";
import Application from "../classes/application/Application";
import { DataBaseModel, Result } from "./types";

type FetchPortion = 'first' | 'next' | 'prev';

export type SaveInstanceOptions = {
  id: string;
  changes: any;
}

export interface GetModelListParams {
  cube: string;
  className: string;
  model: string;
  options: SaveInstanceOptions;
}

export async function saveInstance(application: Application, dbDriver: Sequelize, {
  cube,
  className,
  model: modelName,
  options
}: GetModelListParams): Promise<Result> {

  const modelAlias = `${cube}.${className}.${modelName}`;

  const model = (dbDriver.models[modelAlias] as unknown as DataBaseModel);
  
  try {
    const instance = await model.findOne({ where: { id: options.id }});
    for(const [key, value] of Object.entries(options.changes)) {
      instance[key] = value;
    }

    await instance.save();
    return { error: null, data: options.id };
  } catch (error) {
    return { error: null, message: error.message };
  }
}
