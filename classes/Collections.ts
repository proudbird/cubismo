import Cubismo        from '../cubismo/Cubismo'
import Application    from './Application/Application'
import Cube           from './Cube'
import MetaDataObject from './MetaDataObject'
import { MetaDataObjectDefinition } from './MetaData'
import { Model } from 'sequelize/types'
import MetaDataInstance from './MetaDataInstance'
import Collection from './Collection'
import Instance from './Instance'

export type InstanceCollections = {
  [key: string]: Collection<Instance>
}

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

