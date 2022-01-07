import "../common/Utils";
import "../common/Logger";
import "../errors/Uncaught";
import fs, { readSync }   from 'fs'
import { join as pathJoin} from 'path';
import { writeFile } from "fs/promises";
import bcrypt from "bcryptjs";
import Logger from '../common/Logger';
import '../common/DataCollections/DataSet';
import { sid } from '../common/Utils';
import Router       from "./Router.js"
//import Communicator from './Communicator'
import Application from "../classes/application/Application"
import { MetaDataClassDefinitions } from '../classes/MetaData'

import { loadAddIns } from './AddIns'
import { Applications, ApplicationSettings, CubismoSettings, DatabaseOptions, Environments, IUser, NewApplicationParameters } from "./types";
import getListOfCubes from "../classes/application/getListOfCubes";
import initDatabase from "./initDatabase";
import { Sequelize } from 'sequelize';
import Database from "./Database";
import initApplicationWorkpace from "./initApplicationSpace";

let SECRET_KEY: string;
let API_KEY   : string;

interface ISession {
  time: Date,
  user: IUser
}

export default class Cubismo {

  #database: Database;

  public settings    : CubismoSettings;
  public applications: Map<string, Applications>;
  public addIns      : Map<string, any>; 
  public router      : Router;
  public sessions    : Map<Application, ISession>
  //public communicator: Communicator

  constructor(settings: CubismoSettings, sekretKey?: string) {
    SECRET_KEY = sekretKey;
    API_KEY    = process.env.API_KEY;

    this.settings     = settings;
    this.applications = new Map;
    this.addIns       = new Map;

    loadAddIns(this);
  }

  async start(applicationId?: string): Promise<void> {

    this.#database = new Database(this.settings.connection);
    await this.#database.init();
    
    this.router = new Router(this);

    if(applicationId) {
      this.runApplication(applicationId);
    }

    this.router.run(this.settings.port, this.settings.host);
  }

  stop(key: string): void {
    
    function exit() {
      process.exit()
    }

    if(key === API_KEY) {
      Logger.info(`cubismo server is stopped`);
      // we need some delay to show notification
      setTimeout(exit, 500);
    } else {
      throw new Error(`Can't stop cubismo server: wrong key`);
    }
  }

  access(req, res, next) {

    let message = 'Access denied';

    function refuse(statusCode: number, message: string): void {
      res.status(statusCode).res.send({ error: true, message: message });
    }
  
    if(!this.settings.apiKeyHeader) {
      return refuse(500, `Cubismo settings doesn't has API Key Header`);
    }

    if(!this.settings.apiKey) {
      return refuse(500, `Cubismo settings doesn't has API Key`);
    }

    const key = req.header(this.settings.apiKeyHeader);
    if(!key ) {
      return refuse(401, message);
    }
    if(key !== this.settings.apiKey) {
      return refuse(403, message);
    }
  
    next();
  }

  async addApplication(params: NewApplicationParameters): Promise<void> {

    const result = await this.#database.connection.models.applications.findOne({ where: { name: params.id }});

    if(result) {
      throw new Error(`Applicaton with ID '${params.id}' allready exists`);
    }
  
    const template  = this.settings.templates[params.template];
    if(!template) {
      throw new Error(`Can't find template '${params.template}'`);
    }
    
    const workspace = pathJoin(this.settings.defaults.workspaces, params.id);
    try {
      await initApplicationWorkpace(workspace);
    } catch (error) {
      throw new Error(`Can't initialize new application workspace: ${error}`);
    }
    
    const defaultLang = params.defaultLang || 'en';

    const database  = params.connection?.database || params.connection?.options.database || 'db_' + sid().toLowerCase();
    const host      = params.connection?.host || params.connection?.options.host || this.settings.defaults.connection.host;
    const port      = params.connection?.port || params.connection?.options.port || this.settings.defaults.connection.port;
    const dialect   = params.connection?.dialect || params.connection?.options.dialect || this.settings.defaults.connection.dialect;
    const username  = params.connection?.username || params.connection?.options.username || this.settings.defaults.connection.username;
    const password  = params.connection?.password || params.connection?.options.password || this.settings.defaults.connection.password;
    
    const connection = {
      host,
      port,
      database,
      username,
      password, 
      options: {
        dialect
      }
    } as DatabaseOptions;

    try {
      await initDatabase(this.settings.connection, connection);
    } catch (error) {
      throw new Error(`Can't init new application database: ${error}`);
    }
    
    const settings: ApplicationSettings = {
      workspace,
      defaultLang,
      connection,
      cubes: template
    };
 

    let app: any;
    try {
      const conn = this.#database.connection;
      const values = {
        name: params.id,
        workspace,
        defaultLang
      };
      app = await conn.models.applications.create(values);
    } catch (error) {
      throw new Error(`Can't add a new application with ID '${params.id}' to the application list: ${error}`);
    }

    try {
      const conn = await this.#database.connection.models.connections.create({
        dialect,
        host,
        port,
        database,
        username,
        password
      });
      app.setConnection(conn);
    } catch (error) {
      throw new Error(`Can't add connection settings to a new application with ID '${params.id}': ${error}`);
    }

    try {
      for(let cubeName of template) {
        const cube = await this.#database.connection.models.cubes.create({ name: cubeName });
        app.addCube(cube);
      }
    } catch (error) {
      throw new Error(`Can't add cubes to a new application with ID '${params.id}': ${error}`);
    }

    if(params.user) {
      const application = await this.runApplication(params.id);
      try{
        const newUser = application.users.new();
        newUser.name     = params.user.name;
        newUser.login    = params.user.login;
        newUser.email    = params.user.email;
        newUser.password = params.user.password;
        await newUser.save();
      } catch(error) {
        throw new Error(`Can't add user to the new applicatin ${params.id}: ${error}`);  
      }
    }
  }

  async runApplication(id: string, env?: Environments): Promise<Application> {

    let settings: ApplicationSettings
    
    try {
      settings = await this.getAppSettings(id) as ApplicationSettings;
      Logger.debug(`Application <${id}> is found in the list`);
    } catch (error) {
      throw new Error(`Can't read application settings: ${error}`);
    }

    const applications = this.applications;
    const self = this;

    if(applications.has(id)) {  // app is defined already
      Logger.debug(`Application <${id}> is running already`);
      return applications.get(id).application;
    }
    
    return new Promise<Application>((resolve, reject) => {
      
      let application: Application;
      
      async function onReady(ready: Promise<{ error: Error, mdStructure: MetaDataClassDefinitions }>) {
        const result = await ready;
        if(result.error) {
          applications.delete(id);
          reject(new Error(`Can't run application '${id}': ${result.error.message}`));
        } else {
          // now we can update application data
          applications.set(id, { 
            application, 
            settings, 
            cubes: settings.cubes,  
            mdStructure: result.mdStructure,
            enums: {},
            workspace: settings.workspace  
          });
          resolve(application);
        }
      }

      try { 
        application = new Application(id, settings, env, self, onReady);
        // we register application to prevent loading another instance of one
        applications.set(id, { application, settings, cubes: settings.cubes });
      } catch(error) {
        return reject(error);
      }
    });
  }

  stopApplication(id: string): boolean {
    try {
      this.applications.delete(id);
      return true;
    } catch(error) {
      Logger.error(`Can't find an appplication '${id}' among runnin applications`, error);
      return false;
    }
  }

  async getAppSettings(id: string): Promise<ApplicationSettings | ApplicationSettings[]> {
    
    let app: any;
    try {
      app = await this.#database.connection.models.applications.findOne({ where: { name: id }});
    } catch (error) {
      throw new Error(`Can't find an application with ID '${id}': ${error}`);
    }

    if(!app) {
      throw new Error(`There is no an application with ID '${id}'`);
    }

    let conn: any;
    try {
      conn = await app.getConnection();
    } catch (error) {
      throw new Error(`Can't find connection settings for an application with ID '${id}': ${error}`);
    }

    if(!conn) {
      throw new Error(`There is no connection settings for an application with ID '${id}'`);
    }

    let cubeList: any;
    try {
      cubeList = await app.getCubes();
    } catch (error) {
      throw new Error(`Can't find list of cubes for an application with ID '${id}': ${error}`);
    }

    if(!cubeList) {
      throw new Error(`There is no list of cubes for an application with ID '${id}'`);
    }

    const cubes = [];
    for(let cube of cubeList) {
      cubes.push(cube.name);
    }

    const settings = { ...app.dataValues, connection: { ...conn.dataValues }, cubes };
    settings.id = id;

    return settings;
  }

  destroy() {
    this.router.server.close()
    this.router.server = null
    this.router        = null
    //this.communicator  = null
    this.applications  = null
  }
}