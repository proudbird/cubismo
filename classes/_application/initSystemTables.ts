import Application from "./Application";
import DBDriver from "../../database/DBDriver";
import { config as usersConfig } from "../../database/system/users";

export default async function initSystemTables(application: Application, dbDriver: DBDriver) {

  const connection = dbDriver.connection;
  connection.define(usersConfig.modelName, usersConfig.attributes, { freezeTableName: true });
  await connection.sync();
  
}