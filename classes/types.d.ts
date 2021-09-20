
/// <reference types="sequelize" />

declare const Utils: any;
declare const AddIns: any;

declare class Logger {
/**
     * Prints a message to console with label "WARN"
     * 
     * @param {string} message - a text to be displaied
     * @static
     */
 static warn (message: string): void

/**
* Prints a message to console with label "INFO"
* 
* @param {string} message - a text to be displayed
* @static
*/
static info(message: string): void

/**
* Prints a message to console with label "DEBUG"
* 
* @param {string} message - a text to be displayed
* @static
*/
static debug(message: string): void

/**Prints a message to console with label "ERROR"
* 
* @param {string} message - a text to be displayed
* @param {Error | object} [error] - an instance of Error, or an object representing an error. If it is provided
* an error information will be additionaly displaied
* @static
*/
static error(message: string, error?: Error | object): void

/**Prints a message to console with label "FATAL"
* 
* @param {string} message - a text to be displayed
* @param {Error | object} [error] - an instance of Error, or an object representing an error. If it is provided
* an error information will be additionaly displaied
* @static
*/
static fatal(message: string, error?: Error | object): void
}


declare interface IApplication {
  [key: string]: any
}

declare interface ICube {
  [key: string]: any,
}

declare interface IMetaDataClass {
  [key: string]: any
}

declare interface IMetaDataObject {
  [key: string]: any
}

declare interface IMetaDataInstance {
  [key: string]: any
}

declare interface IModelStructure {
  [key: string]: any
}

// declare class MetaDataItem {

//   #name        : string
//   #type        : MetaDataItemType
//   #application : Application
//   #cube        : Cube 
//   #dirname     : string
//   #filename    : string
// }

declare type MetaDataItemCache = {
  lasrUpdated: Date,
  module: NodeModule
} 





// declare class MetaDataCollection {

//   #cache: Map<MetaDataItem, MetaDataItemCache>

//   add(element: MetaDataItem): MetaDataItem
// }

/**
 * The object defining an application structure
 * and providing an API for managing it
 */
//  declare class Application extends MetaDataItem {

//   #id       : string
//   #settings : AppSettings
//   #cubes    : Cubes
//   #dbDriver : string
//   #views    : View[]

//   constructor(settings: AppSettings);

//   init(): void;
  
//   /**
//    * Returns the ID of the applacation
//    * 
//    * @return {string} the ID of the applacation
//    */
//   get id(): string;

//   /**
//    * Returns the collection of the application cubes
//    * 
//    * @return {Cubes} the ID of the applacation
//    */
//    get cubes(): Cubes;

//   /**
//    * Returns the main view of the current process 
//    * 
//    * @return {View} the main view
//    */
//   get window(): any;

//   /**
//    * Returns the language of the current process 
//    * 
//    * @return {string} the language
//    */
//   get lang(): string;
// }

/**
 * A separete module of the application
 */
//  declare class Cube extends MetaDataItem {

//   #application : Application
//   #cube        : Cube | undefined
//   #name        : string
//   #type        : MetaDataItemType
//   #dirname     : string
//   #filename    : string
//   #elements    : MetaDataCollection

// }

/**
 * A separete module of the application
 */
//  declare class Cubes extends MetaDataCollection {

// }

/**
 * A visual form, that provides commnikation with a user
 */
 declare class View {

}

declare type RequireArguments = {
  [key: string]: any
}

declare type DataTable = {
  columns: any[],
  rows: any[]
}