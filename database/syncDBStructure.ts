import Application from '../classes/application/Application'
import Logger from '../common/Logger';
import DBDriver from './DBDriver'
import { DataBaseModel, DataBaseModels, DataBaseSchema, TableFieldRawAttributes } from './types'

export default async function syncDBStructure(application: Application, dbDriver: DBDriver): Promise<void> {

    const qi = dbDriver.connection.getQueryInterface()

    const safeChanges   = []
    const unSafeChanges = []
    const tablesToDelete= {}
    const fieldsToDelete= {}

    const serviceFields = ['id'       , 'dropped'  , 'isFolder' ,
                           'booked'   , 'Date'     , 'parentId' , 
                           'ownerId'  , 'createdAt', 'updatedAt', 
                           'deletedAt', 'order']

    function changeColumn(model    : DataBaseModel,
                          tableName: string, 
                          modelCol : any, 
                          dbCol    : TableFieldRawAttributes, 
                          hasRows  : boolean
      ): void {

      const actionOptions = {
        action   : 'changeColumn',
        tableName: tableName,
        key      : modelCol.field,
        attribute: { type: modelCol.type },
        model    : model
      }

      let type  : string
      let length: number

      if (dbCol.type.includes('CHARACTER VARYING')) {
          type   = 'STRING'
          length = parseInt(dbCol.type.match(/\d+/g).join(''))
      } else if (dbCol.type === 'DATE') {
          type = 'DATEONLY'
      } else if (dbCol.type === 'TIMESTAMP WITH TIME ZONE') {
          type = 'DATE'
      } else {
          type = dbCol.type
      }

      if (type === 'STRING' && modelCol.type.key === 'STRING') {
        if (length === modelCol.type._length) {
          // nothing to change
        } else if (length < modelCol.type._length) {
          safeChanges.push(actionOptions)
        } else {
          if (!hasRows) {
            // table doesn't have rows, so we can change column without data loss
            safeChanges.push(actionOptions)
          } else {
            unSafeChanges.push(actionOptions)
          }
        }

      } else if (type === 'REAL' && modelCol.type.key === 'FLOAT') {
        // nothing to change

      } else if (type === 'REAL' && modelCol.type.key === 'DECIMAL') {
        // nothing to change

      } else if (type === 'NUMERIC' && modelCol.type.key === 'DECIMAL') {
        // nothing to change

      } else if (type === modelCol.type.key) {
        // 

      } else {
        if (!hasRows) {
          // table doesn't have rows, so we can change column without data loss
          safeChanges.push(actionOptions)
        } else {
          unSafeChanges.push(actionOptions)
        }
      }
    }

    async function compareColumns(model      : DataBaseModel, 
                                  tableName  : string, 
                                  description: any, 
                                  dbSchema   : DataBaseSchema, 
                                  hasRows    : boolean
      ): Promise<void> {

      for (const key in  model.fieldRawAttributesMap) {
        const modelCol =  model.fieldRawAttributesMap[key]
        if (!dbSchema[tableName][modelCol.field]) {
          // table doesn't have such a column, so let's add it
          safeChanges.push({
            action   : 'addColumn',
            tableName: tableName,
            key      : modelCol.field,
            attribute: { type: modelCol.type },
            model    : model
          })
        } else {
          const dbCol = description[modelCol.field] as TableFieldRawAttributes
          changeColumn(model, tableName, modelCol, dbCol, hasRows)
          delete fieldsToDelete[modelCol.field]
        }
        Promise.resolve()
      }
    }

    async function compareTables(models: any, dbSchema: DataBaseSchema): Promise<void> {

      for (const key in models) {
        const model = models[key];
        if(model.definition && key === model.definition.id) {
          continue;
        }
        if (!dbSchema[model.tableName]) {
          // DB doesn't have such a table, so let's create it
          safeChanges.push({
            action    : 'createTable',
            tableName : model.tableName,
            attributes: model.tableAttributes,
            options   : model.options,
            model     : model
          })
        } else {
          const description = await qi.describeTable(model.tableName)
          const hasRows: boolean = await model.findOne({ attributes: ['id']}) ? true : false
          await compareColumns(model, model.tableName, description, dbSchema, hasRows)
          // delete table from the list - it will allow us to detect those tables we need to drop
          delete tablesToDelete[model.tableName]
        }
      }
    }

    async function executeChanges(dbSchema: DataBaseSchema): Promise<void> {

      const changes = safeChanges.concat(unSafeChanges)
      changes.forEach(async (change) => {
        switch (change.action) {
          case 'createTable':
            try {
              await qi.createTable(change.tableName, change.attributes, change.options)
              Logger.debug(`New metadata object is created: ${change.model.name}`)
            } catch (error) {
              return Logger.error(`Unsuccessful attempt to create new object: ${change.model.name}`, error);
            }
            break
          case 'addColumn':
            try {
              await qi.addColumn(change.tableName, change.key, change.attribute)
              Logger.debug(`New attribute '${change.key}' added to the object '${change.model.name}'`)
            } catch (error) {
              return Logger.error(`Unsuccessful attempt to add attribute '${change.key}' to the object '${change.model.name}'`, error)
            }
            break
          case 'changeColumn':
            try {
              await qi.changeColumn(change.tableName, change.key, change.attribute)
              Logger.debug(`Attribute ${change.key} has been changed in object ${change.model.name}`)
            } catch (error) {
              return Logger.error(`Unsuccessful attempt to change attribute '${change.key}' to the object '${change.model.name}'`, error);
            }
            break
        }
      })

      // TODO: now we firstly remowe unused fields from tables, and then we drop uneused tables,
      //       but we can drop the whole table, and don't care about its fields
      // deleting fields (attributes), that are not used any more in our app
      for (const fieldName in fieldsToDelete) {
        try {
          await qi.removeColumn(fieldsToDelete[fieldName], fieldName)
          Logger.debug(`Column '${fieldName}' has been remowed from table '${fieldsToDelete[fieldName]}'`)
        } catch (error) {
          return Logger.error(`Unsuccessful attempt to remowed column '${fieldName}' from table '${fieldsToDelete[fieldName]}'`, error)
        }
      }

      // deleting tables (objects), that are not used any more in our app
      for (const tableName in tablesToDelete) {
        try {
          await qi.dropTable(tableName)
          Logger.debug(`Table '${tableName}' has been dropped`)
        } catch (error) {
          return Logger.error(`Unsuccessful attempt to dropp table '${tableName}'`, error)
        }
      }
    }

    let dbSchema: DataBaseSchema
    try {
      dbSchema = await dbDriver.provider.getSchema()
    } catch(err) {
      throw new Error(`Unsuccessful attempt to get database schema: ${err}`)
    }

    for (const tableName in dbSchema) {
      const fields = dbSchema[tableName]
      tablesToDelete[tableName] = tableName 
      for (const key in fields) {
       fieldsToDelete[key] = tableName 
      }
    }
    await compareTables(dbDriver.connection.models, dbSchema);
    await executeChanges(dbSchema);
}