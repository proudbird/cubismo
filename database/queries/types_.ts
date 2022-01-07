export namespace DB {

  export interface IDataSchema {
    dataSets: IDataSet[]
  }

  export interface IDataSet {
    sources    : IDataSource[]
    fields     : IField[]
    joins     ?: IJoin[]
    conditions?: ICondition[]
    grouppings?: IGroupping[]
    orderings ?: IOrdering[]
    lang       : Lang
  }

  export type IDataSource = IApplicationDataSource | ITempDataSource

  export interface IApplicationDataModel {

  }

  export interface IApplicationDataSource {
    type     : DataSourceType
    name     : string
    tableName: string
    alias   ?: string
    fields   : any
  }

  export interface ITempDataSource {
    type     : DataSourceType
    tableName: string
    alias   ?: string
    source   : ITempSource
    fields   : any
  }

  export enum DataSourceType {
    APPLICATION,
    TEMP_SOURCE
  }

  export interface ITempSource {
    [Symbol.iterator](): Iterator<ITempSourceEntry>
  }

  export interface ITempSourceEntry {
    [property: string]: any
  }

  export interface IField {
    fieldName : string,
    dataType  : DataType,
    lang     ?: Lang,
    length   ?: number,
    scale    ?: number,
    reference?: string
  }

  export interface IJoin {

  }

  export interface ICondition {

  }

  export interface IGroupping {

  }

  export interface IOrdering {

  }

  export interface IDataRecords {

  }
  
  export interface IQueryStatement {
    // select   : Fields | '*',
    // from     : QueryFromStatement | [QueryFromStatement, string],
    // distinct?: boolean,
    // cases   ?: CaseStatement[],
    // joins   ?: (InnerJoinStatement|LeftJoinStatement|RightJoinStatement|FullJoinStatement)[],
    // where   ?: BooleanStatement | ConditionStatement,
    // groupBy ?: GroupByStatement,
    // orderBy ?: OrderByStatement,
    // limit   ?: number,
    // offset  ?: number,
    // as      ?: string 
  }

  export type DataType = 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'ENUM' | 'FK'
}

export interface IQueryExecuter {
  query(rawSQLQuery: string): DB.IDataRecords
}


export type Lang = 'ab' | 'aa' | 'af' | 'ak' | 'sq' | 'am' | 'ar' | 'an' | 'hy' | 'as' | 'av' | 'ae' | 'ay' | 
            'az' | 'bm' | 'ba' | 'eu' | 'be' | 'bn' | 'bh' | 'bi' | 'bs' | 'br' | 'bg' | 'my' | 'ca' | 
            'ch' | 'ce' | 'ny' | 'zh' | 'cv' | 'kw' | 'co' | 'cr' | 'hr' | 'cs' | 'da' | 'dv' | 'nl' | 
            'dz' | 'en' | 'eo' | 'et' | 'ee' | 'fo' | 'fj' | 'fi' | 'fr' | 'ff' | 'gl' | 'gd' | 'gv' | 
            'ka' | 'de' | 'el' | 'kl' | 'gn' | 'gu' | 'ht' | 'ha' | 'he' | 'hz' | 'hi' | 'ho' | 'hu' | 
            'is' | 'io' | 'ig' | 'id' | 'ia' | 'ie' | 'iu' | 'ik' | 'ga' | 'it' | 'ja' | 'jv' | 'kl' | 
            'kn' | 'kr' | 'ks' | 'kk' | 'km' | 'ki' | 'rw' | 'rn' | 'ky' | 'kv' | 'kg' | 'ko' | 'ku' | 
            'kj' | 'lo' | 'la' | 'lv' | 'li' | 'ln' | 'lt' | 'lu' | 'lg' | 'lb' | 'gv' | 'mk' | 'mg' | 
            'ms' | 'ml' | 'mt' | 'mi' | 'mr' | 'mh' | 'mo' | 'mn' | 'na' | 'nv' | 'ng' | 'nd' | 'ne' | 
            'no' | 'nb' | 'nn' | 'ii' | 'oc' | 'oj' | 'cu' | 'or' | 'om' | 'os' | 'pi' | 'ps' | 'fa' | 
            'pl' | 'pt' | 'pa' | 'qu' | 'rm' | 'ro' | 'ru' | 'se' | 'sm' | 'sg' | 'sa' | 'sr' | 'sh' | 
            'st' | 'tn' | 'sn' | 'ii' | 'sd' | 'si' | 'ss' | 'sk' | 'sl' | 'so' | 'nr' | 'es' | 'su' | 
            'sw' | 'ss' | 'sv' | 'tl' | 'ty' | 'tg' | 'ta' | 'tt' | 'te' | 'th' | 'bo' | 'ti' | 'to' | 
            'ts' | 'tr' | 'tk' | 'tw' | 'ug' | 'uk' | 'ur' | 'uz' | 've' | 'vi' | 'vo' | 'wa' | 'cy' | 
            'wo' | 'fy' | 'xh' | 'yi' | 'yo' | 'za' | 'zu'            