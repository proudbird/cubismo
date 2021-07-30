import Cubismo        from '../cubismo'
import Application    from './Application/Application'
import Cube           from './Cube'
import MetaDataObject from './MetaDataObject'
import { MetaDataObjectDefinition } from './MetaData'
import { Model } from 'sequelize/types'
import MetaDataInstance from './MetaDataInstance'

export default class Collections extends MetaDataObject {

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

