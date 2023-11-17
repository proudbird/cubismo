import Application from '../classes/application/Application'
import Cube from '../classes/Cube'
import Cubismo from '../core/Cubismo'
import Sequelize from 'sequelize'
import { Model } from 'sequelize'
import Instance from '../classes/Instance'
import Enum, { EnumValue } from '../classes/Enum'

export type ConnectionConfig = Sequelize.Options 
        &{ options?: Sequelize.Options } &{dialect?: Sequelize.Dialect}

export type DataTypeConfig = {
  type          : Sequelize.DataTypes.AbstractDataTypeConstructor 
                | Sequelize.DataTypes.StringDataType 
                | Sequelize.DataTypes.IntegerDataTypeConstructor,
  defaultValue? : Sequelize.DataTypes.AbstractDataTypeConstructor 
                | boolean 
                | number 
                | null, 
  primaryKey?   : boolean,
  unique?       : boolean,
  autoIncrement?: boolean
}

export type TableFieldRawAttributes = {
  field: string,
  type : string
}

export type DataBaseModel = Model & {
  tableName      : string,
  tableAttributes: [],
  fieldRawAttributesMap: [TableFieldRawAttributes],
  options        : {}
  findOne: Function,
  findOrCreate: Function,
  build: Function,
  create: Function,
  definition: ModelDefinition,
  name: string,
  modelName: string,
  cubismo?: Cubismo,
  application?: Application,
  cube?: Cube,
  class?: string,
  owners?: DataBaseModel[],
  ownerModel?: DataBaseModel
  associations: ModelAssociations
}

export interface ModelAssociations {
  [name: string]: {
    target: DataBaseModel
  }
}

export type DataBaseModels = {
  [key: string]: DataBaseModel
} 

export type DataBaseSchema = {
  [key: string]: DataBaseTableDefinition
}

export type DataBaseTableDefinition = {
  [key: string]: DataBaseColumnDefinition
}

export type DataBaseColumnDefinition = {
  tablename   : string, 
  columnname  : string, 
  datatype    : string, 
  defaultvalue: string | number | boolean | null, 
  required    : string, 
  position    : number, 
  length      : number | null
}

export type ModelDefinitionBase = {
  id: string,
  name: string,
  cube: string,
  class: string,
  tableId: string,
  title: string,
  description: string,
  attributes: {
    [name: string]: ModelAttributeDefinition
  }
}

export type CatalogModelDefinition = ModelDefinitionBase & {
  multilevel: true,
  multievelType: string,
  numberOfLevels: number,
  codeLenght: number,
  codeType: string,
  uniqueCode: true,
  autoIncrement: true,
  nameLenght: number,
  nameLang: string[],
  template: string,
  owners: string[],
  collections: CollectionSDefinition;
  "attributes": {
    "Product": {
      "fieldId": "FL_WkNJicn9",
      "title": "Product",
      "description": "Product",
      "type": {
        "dataType": "FK",
        "reference": {
          "cube": "this",
          "class": "Catalogs",
          "modelId": "cc9516a3-0aeb-458b-8d1e-e2c76ffd6c4b"
        }
      },
      "defaultValue": "",
      "toolTip": "",
      "belonging": "item",
      "required": true
    },
  }
}

export type CollectionSDefinition = {
  [id: string]: {
    name: string,
    class: string,
    tableId: string,
    attributes: {
      [name: string]: ModelAttributeDefinition
    }
  }
}

export type ModelAttributeDefinition = {
  fieldId: string,
  title?: string,
  description?: string,
  type: {
    dataType: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'ENUM' | 'FK',
    lang?: string[],
    length?: number,
    scale?: number,
    reference?: {
      cube?: string,
      class?: string,
      modelId: string
    }
  },
  defaultValue?: string | number | boolean | Date | null,
  toolTip?: string,
  belonging?: string,
  required?: boolean
}

export type ConstantAtrributes = {
  id       : DataTypeConfig
}

export type CatalogAttributes = {
  id       : DataTypeConfig,
  dropped  : DataTypeConfig,
  isFolder?: DataTypeConfig,
  level?   : DataTypeConfig,
  Code?    : DataTypeConfig,
  Name?    : DataTypeConfig
}

export type RegistratorAttributes = {
  id       : DataTypeConfig,
  dropped  : DataTypeConfig,
  booked?  : DataTypeConfig,
  Date?    : DataTypeConfig,
  Number?  : DataTypeConfig
}

export type AttributeOptions = {
  attributes: any,
  belongsTo: any
}

export type Value<T extends Instance> = string | number | boolean | Date | EnumValue | Promise<T>;

export type ModelDefinition = CatalogModelDefinition;

export type SaveOptions = Sequelize.Transactionable;

export declare type Result = {
  error: boolean,
  message?: string,
  data?: any
}