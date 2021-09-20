import Application from '../classes/application/Application'
import Cube from '../classes/Cube'
import Cubismo from '../cubismo/Cubismo'
import Sequelize from 'sequelize'
import { Model } from 'sequelize'

export type ConnectionConfig = Sequelize.ConnectionOptions 
        &{ options: Sequelize.Options }

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
  definition: ModelDefinition,
  name: string,
  modelName: string,
  cubismo: Cubismo,
  application: Application,
  cube: Cube,
  class: string,
  owners: DataBaseModel[],
  ownerModel: DataBaseModel

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

export type ModelDefinition = {
  id: string,
  name: string,
  cube: string,
  class: string,
  tableId: string,
  title: string,
  description: string,
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
  attributes: {
    [name: string]: ModelAttributeDefinition
  }
}

export type ModelAttributeDefinition = {
  fieldId: string,
  title?: string,
  description?: string,
  type: {
    dataType: string,
    lang?: string[],
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

export type CatalogAtrributes = {
  id       : DataTypeConfig,
  dropped  : DataTypeConfig,
  isFolder?: DataTypeConfig,
  level?   : DataTypeConfig,
  Code?    : DataTypeConfig,
  Name?    : DataTypeConfig
}

export type AttributeOptions = {
  attributes: any,
  belongsTo: any
}

