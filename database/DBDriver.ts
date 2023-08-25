import { Sequelize } from 'sequelize'
import Provider from './Provider'
import Postgres from './Postgres'

import { ConnectionConfig } from './types'

export default class DBDriver {

  #connection: Sequelize
  #provider  : Postgres

  constructor(config: ConnectionConfig) {
    this.#connection = new Sequelize(
      config.database,
      config.username,
      config.password,
      { dialect: config.dialect,
        port: config.port,
        logging: false,
        //@ts-ignore
        charset: "utf8",
        collate: 'utf8_general_ci'
      },
    )

    if (config.dialect === "postgres") {
      this.#provider = new Postgres(this.#connection)
    } else {
      throw new Error(`Dialect ${config.options.dialect} is not supported yet. Supported dialect is: postgres`)
    }
  }

  get connection(): Sequelize {
    return this.#connection
  }

  get provider(): Postgres  {
    return this.#provider
  }
}