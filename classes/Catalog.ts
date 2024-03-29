import Cubismo        from '../core/Cubismo'
import Application    from './application/Application'
import Cube           from './Cube'
import MetaDataObject from './MetaDataObject'
import { MetaDataObjectDefinition } from './MetaData'
import { Model } from 'sequelize/types'
import MetaDataInstance from './MetaDataInstance'


export default class Catalog extends MetaDataObject {

  constructor(
    cubismo      : Cubismo,
    application  : Application, 
    cube         : Cube, 
    type         : MetaDataObjectDefinition,
    name         : string, 
    dirname      : string, 
    filename     : string,
    model        : Model,
    instanceMaker: MetaDataInstance
  ) {
    
    super(
      cubismo,
      application, 
      cube, 
      type,
      name, 
      dirname, 
      filename,
      model,
      instanceMaker
    )
  }
}