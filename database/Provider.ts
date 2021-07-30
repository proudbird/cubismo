import { Sequelize } from 'sequelize'

export default class Provider {

  protected connection: Sequelize

  constructor(connection: Sequelize) {
    this.connection = connection
  }


}