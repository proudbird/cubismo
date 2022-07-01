import { Client } from 'pg';

import iconv from 'iconv-lite';
import { ConnectionConfig } from '../database/types';

let client: Client;
export default async function initDatabase(cubismoConnection: ConnectionConfig, applicationConnection: ConnectionConfig): Promise<void> {
  try {
    client = new Client({
      user: cubismoConnection.username,
      host: cubismoConnection.host,
      database: cubismoConnection.database,
      password: cubismoConnection.password,
      port: cubismoConnection.port,
    });
    await client.connect();

    let queryString = `SELECT EXISTS ( 
        SELECT datname FROM pg_catalog.pg_database WHERE datname = '${applicationConnection.database.toLowerCase()}'
      )`;
    const exists = await client.query(queryString);
    if (exists.rows[0].exists) {
      if (!process.env.CAN_DUPLICATE_APPS) {
        throw new Error(`Can't create database '${applicationConnection.database}', because it allready exists`);
      }
    } else {
      queryString = `CREATE DATABASE ${applicationConnection.database}`;
      // WITH ENCODING 'UTF8'
      // LC_COLLATE = 'ru_RU.UTF-8'
      // LC_CTYPE = 'ru_RU.UTF-8'
      // TEMPLATE = template0;`;
      const result = await client.query(queryString);
    }
    await client.end();
  } catch (error) {
    const str = iconv.decode(error, 'win1251');
    await client.end();
    throw new Error(`Can't create database '${applicationConnection.database}': ${error}`);
  }
}
