import vm from "node:vm";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

import { parse } from '@typescript-eslint/parser';
import { Program, Parameter } from "@typescript-eslint/types/dist/generated/ast-spec"
import { ModelDefinition } from "../../database/types";
import transformCode from "../../classes/transformeCode";
import runModule from "../../classes/runModule";

export class AppMemberDefinition {

  moduleType: ModuleType;
  cubeName  : string | undefined;
  metaDataClassName       : string | undefined;
  metaDataObjectDefinition: ModelDefinition | undefined;
  name   : string;
  dir    : string;
  file   : string;
  astTree: any;
  members: AppMemberDefinition[];
  source: string;
  description: string;
  properties: { name: string, type: string }[];

  constructor(
    moduleType: ModuleType, 
    cubeName                : string | undefined, 
    metaDataClassName       : string | undefined, 
    metaDataObjectDefinition: ModelDefinition | undefined,
    name: string, 
    filename: string,
    dir?: string,
    ) {
      this.moduleType               = moduleType;
      this.cubeName                 = cubeName;
      this.metaDataClassName        = metaDataClassName;
      this.metaDataObjectDefinition = metaDataObjectDefinition;
      this.name = name;
      this.dir = dir;
      this.members = [];
      this.properties = [];
      if(existsSync(filename)) {
        if(this.moduleType !== ModuleType.Type) {
          try {
            this.source  = readFileSync(filename, 'utf-8');
            this.astTree = parse(this.source, { comment: true, range: true, loc: true });
          } catch(error) {
            // console.error(`Can't parse source file (${error})`);
          }
        }
      }

      if(this.moduleType === ModuleType.View) {
        const dataFile = join(this.dir, 'Views', this.name, `${this.name}.data.ts`);
        if(existsSync(dataFile)) {
        
          const data = runModule(dataFile, {}, {}, {}) as any;
          this.properties = Object.entries(data?.default).map(([name, value]: any) => (
            { name: name, type: value.type }
          ));
        }
      }
 
  }
}

export enum ModuleType {
  Application = 'application',
  Cube        = 'cube',
  Module      = 'module',
  Constant    = 'constant',
  Catalog     = 'catalog',
  Registrator = 'registrator',
  DataSet     = 'dataset',
  Enum        = 'enum',
  Type        = 'type',
  View        = 'view',
}

export const ModuleTypeDictionary = {
  Modules      : ModuleType.Module,
  Constants    : ModuleType.Constant,
  Catalogs     : ModuleType.Catalog,
  Registrators : ModuleType.Registrator,
  DataSets     : ModuleType.DataSet,
  Enums        : ModuleType.Enum,
  Types        : ModuleType.Type,
  Views        : ModuleType.View,
}

export enum MultiLevelType {
  FoldersAndItems = 'foldersAndItems',
  Items = 'items'
}

export enum CodeType {
  String = 'STRING',
  Integer = 'INTEGER'
}

export enum DateType {
  DateAndTime = 'DATETIME',
  OnlyDate    = 'DATE',
  OnlyTIME    = 'TIME',
}

export enum DataType {
  String      = 'STRING',
  Number      = 'NUMBER',
  Boolean     = 'BOOLEAN',
  Date        = 'DATE',
  Reference   = 'FK'
}

export enum AtrributeBelonging {
  Folders = 'folders',
  Items = 'items',
  FoldersAndItems = 'foldersAndItems'
}

export type MetaDataObjectAttributes = {
  [name: string]: MetaDataObjectAttribute
}

export type MetaDataObjectAttribute = {
  fieldId: string,
  title: string,
  description: string,
  type: {
    dataType: DataType,
    length?: number,
    scale?: number,
    lang?: string[],
    dateType?: DateType,
    reference?: {
      cube: string,
      class: string,
      modelId: string
    }
  },
  defaultValue: string | number | boolean  | Date | null,
  toolTip: string,
  belonging: AtrributeBelonging,
  required: boolean
}

export type MetaDataObjectCollections = {
  [id: string]: {
    name: string,
    class: string,
    tableId: string,
    attributes: MetaDataObjectAttributes
  }
}

export type CatalogDefinition = {
  name: string,
  cube: string,
  class: string,
  tableId: string,
  title: string,
  description: string,
  multilevel: boolean,
  multilevelType: MultiLevelType,
  numberOfLevels: number,
  codeLength: number,
  codeType: CodeType,
  uniqueCode: boolean,
  autoIncrement: boolean,
  nameLength: number,
  nameLang: string[],
  template: string,
  owners: string[],
  collections: MetaDataObjectCollections,
  attributes: MetaDataObjectAttributes
}

export type EnumDefinition = {
  name: string,
  cube: string,
  class: string,
  tableId: string,
  title: string,
  description: string,
  values: EnumValue[]
}

export type EnumValue = {
  id: string,
  name: string,
  title: string
}

export type TypeDefinition = {
  name: string,
  cube: string,
  class: string,
  tableId: string,
  title: string,
  description: string,
  values: EnumValue[]
}