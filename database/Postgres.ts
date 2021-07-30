import { Sequelize } from 'sequelize'
import { DataBaseColumnDefinition, DataBaseSchema } from './types'
import Provider from './Provider'

export default class Postgres extends Provider {

  constructor(connection: Sequelize) {
    super(connection)
  }
  
  async getSchema(): Promise<DataBaseSchema> {

    let dbSchema: DataBaseSchema = {}

    const queryString = [
      'SELECT table_name AS tableName,', 
        'column_name AS columnName,', 
        'data_type AS dataType,',
        'column_default AS defaultValue,', 
        'is_nullable AS required,',
        'ordinal_position AS position,', 
        'character_maximum_length AS length',
      'FROM information_schema.columns',
      'WHERE table_schema NOT IN',
        "('pg_catalog', 'information_schema')",
      'AND table_catalog IN',
        "('" + this.connection.config.database + "')"
    ]

    // const queryString = [`SELECT c.conname, c.conkey, pg_get_constraintdef(c.oid)
    // FROM   pg_constraint c
    // JOIN  (
    //   SELECT attnum AS attkey
    //   FROM   pg_attribute
    //   ) a ON c.conkey[0] = a.attkey 
    // WHERE  c.contype  = 'u'`]

    // const queryString = [
    //   'SELECT *',
    //   'FROM information_schema.columns',
    //   'WHERE table_schema NOT IN',
    //     "('pg_catalog', 'information_schema')",
    //   'AND table_catalog IN',
    //     "('" + this.connection.config.database + "')"
    // ]

    let result: [any[], any]
    try {
      result = await this.connection.query(queryString.join(" ")) 
    } catch(error) {
      return Promise.reject(error)
    }  

    for (let i = 0; i < result[0].length; i++) {
        const columnDefinition: DataBaseColumnDefinition = result[0][i]

        if(!dbSchema[columnDefinition.tablename]) {
          dbSchema[columnDefinition.tablename] = {}
        }

        dbSchema[columnDefinition.tablename][columnDefinition.columnname] = columnDefinition
    }

    return Promise.resolve(dbSchema)
  }
}