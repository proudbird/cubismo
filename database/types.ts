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
  findOne: Function
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

