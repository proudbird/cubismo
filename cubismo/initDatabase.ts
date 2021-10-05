import { ConnectionConfig } from "../database/types";
import { Client } from "pg";

export default async function initDatabase(config: any): Promise<void>  {
  
  try {

    const client = new Client({
      user: process.env.CON_USERNAME,
      host: process.env.CON_HOST,
      database: process.env.CON_DATABASE,
      password: process.env.CON_PASSWORD,
      port: process.env.CON_PORT
    });
    client.connect()

    let queryString = 
      `SELECT EXISTS ( 
        SELECT datname FROM pg_catalog.pg_database WHERE datname = '${config.database.toLowerCase()}'
      )`;
      const exists = await client.query(queryString);
      if(exists.rows[0].exists) {
        throw new Error(`Can't create database '${config.database}', because it allready exists`);
      }

      queryString = `CREATE DATABASE ${config.database}`;
      const result = await client.query(queryString);
  } catch(error) {
    throw new Error(`Can't create database '${config.database}': ${error}`);
  }
}