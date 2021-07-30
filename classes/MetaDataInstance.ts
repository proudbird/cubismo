import { Model } from 'sequelize'

export default class MetaDataInstance {

  #model   : any
  protected record  : any


  constructor(model: any, predefinedValues?: any) {
    this.#model = model

    
  }

}