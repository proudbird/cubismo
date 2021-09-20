import { Client } from "pg";

export default async function initDatabase(defaults, database: string, username: string, password: string): Promise<undefined | Error>  {
  
  try {
    const client = new Client({
      user: defaults.username,
      host: defaults.host,
      database: defaults.database,
      password: defaults.password,
      port: 5432,
    })
    client.connect()

    let queryString = 
      `SELECT EXISTS ( 
        SELECT datname FROM pg_catalog.pg_database WHERE datname = '${database.toLowerCase()}'
      )`;
      const exists = await client.query(queryString);
      if(exists.rows[0].exists) {
          return new Error(`Can't create database '${database}', because it allready exists`);
      }

      queryString = `CREATE DATABASE ${database}`;
      const result = client.query(queryString);
  } catch(error) {
    return new Error(`Can't create database '${database}': ${error}`);
  }

  return undefined;
}