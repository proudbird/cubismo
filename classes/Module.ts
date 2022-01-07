import Cubismo        from '../core/Cubismo'
import Application    from './Application/Application'
import Cube           from './Cube'
import MetaDataObject from './MetaDataObject'
import { MetaDataObjectDefinition } from './MetaData'
import { Model } from 'sequelize/types'
import MetaDataInstance from './MetaDataInstance'


export default class Module {

  #cubismo      : Cubismo
  #application  : Application
  #cube         : Cube
  #name         : string
  #type         : MetaDataObjectDefinition
  #dirname      : string
  #filename     : string
  
  constructor(
        cubismo      : Cubismo,
        application  : Application, 
        cube         : Cube, 
        type         : MetaDataObjectDefinition,
        name         : string, 
        dirname      : string, 
        filename     : string
    ) {
   
    this.#cubismo       = cubismo
    this.#application   = application
    this.#cube          = cube
    this.#name          = name
    this.#type          = type
    this.#dirname       = dirname
    this.#filename      = filename
  }

  get cube(): Cube {
    return this.#cube;
  }

  get type(): string {
    return this.#type.type
  }

  get name(): string {
    return this.#name
  }
}