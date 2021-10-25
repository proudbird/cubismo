import "../common/Utils";
import "../common/Logger";
import "../errors/Uncaught";
import fs, { readSync }   from 'fs'
import { join as pathJoin} from 'path';
import { writeFile } from "fs/promises";
import bcrypt from "bcryptjs";
import Logger from '../common/Logger';
import Router       from "./Router.js"
import Communicator from './Communicator'
import Application from "../classes/application/Application"
import { MetaDataClassDefinitions } from '../classes/MetaData'

import { loadAddIns } from './AddIns'
import { Applications, ApplicationSettings, CubismoSettings, Environments, NewApplicationParameters } from "./types";
import getListOfCubes from "../classes/application/getListOfCubes";
import initApplicationSpace from "./initApplicationSpace";
import initDatabase from "./initDatabase";

let SECRET_KEY: string;
let API_KEY   : string;

export default class Cubismo {

  public dir         : string;
  public settings    : CubismoSettings;
  public applications: Map<string, Applications>;
  public addIns      : Map<string, any>; 
  public router      : Router
  public communicator: Communicator

  constructor(dir, sekretKey?: string) {
    SECRET_KEY = sekretKey;
    API_KEY    = process.env.API_KEY;

    this.settings     = initSettings();
    this.dir          = dir;
    this.applications = new Map;
    this.addIns       = new Map;
  }

  async start(applicationId: string): Promise<void> {
    
    this.router = new Router(this);

    if(applicationId) {
      const env = {
        HOST: '127.0.0.1',
        PORT: process.env.PORT,
        API_KEY: process.env.API_KEY,
        API_KEY_HEADER: process.env.API_KEY_HEADER,
        ADMIN_EMAIL: process.env.ADMIN_EMAIL,
        ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
        NOREPLY_HOST: process.env.NOREPLY_HOST,
        NOREPLY_PORT: process.env.NOREPLY_PORT,
        NOREPLY_USERNAME: process.env.NOREPLY_USERNAME,
        NOREPLY_PASSWORD: process.env.NOREPLY_PASSWORD
      };
      this.runApplication(applicationId, env);
    }

    this.communicator = new Communicator(this.router.server, this.applications);

    await loadAddIns(this);

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

  async addApplication(params: NewApplicationParameters): Promise<void> {

    let appList: ApplicationSettings[];
    try {
      appList = await this.getAppSettings() as ApplicationSettings[];
    } catch (error) {
      throw new Error(`Can't read application settings: ${error}`);
    }

    if(appList[params.id]) {
      throw new Error(`Applicaton with ID '${params.id}' allready exists`);
    }
  
    const template  = this.settings.templates[params.template];
    if(!template) {
      throw new Error(`Can't find template '${params.template}'`);
    }
    
    const dirname   = pathJoin(this.settings.defaults.applications.root, params.id);
    const workspace = pathJoin(this.settings.defaults.applications.workspaces, params.id);
    try {
      await initApplicationSpace(template.dirname, dirname, workspace);
    } catch (error) {
      throw new Error(`Can't initialize new application space: ${error}`);
    }
    
    const defaultLang = params.defaultLang || 'en';

    const database  = Utils.get(params, 'dbConfig.database') || Utils.get(params, 'dbConfig.options.database') || 'db_' + Utils.sid().toLowerCase();
    const host      = Utils.get(params, 'dbConfig.host') || Utils.get(params, 'dbConfig.options.host') || this.settings.defaults.database.host;
    const port      = Utils.get(params, 'dbConfig.port') || Utils.get(params, 'dbConfig.options.port') || this.settings.defaults.database.port;
    const username  = Utils.get(params, 'dbConfig.username') || Utils.get(params, 'dbConfig.options.username') || this.settings.defaults.database.username;
    const password  = Utils.get(params, 'dbConfig.password') || Utils.get(params, 'dbConfig.options.password') || this.settings.defaults.database.password;
    
    const dbConfig = {
      host,
      port,
      database,
      username,
      password, 
      options: {
        dialect: "postgres"
      }
    };

    try {
      await initDatabase(dbConfig);
    } catch (error) {
      throw new Error(`Can't init new application database: ${error}`);
    }
    
    const settings: ApplicationSettings = {
      dirname,
      workspace,
      dbConfig,
      defaultLang
    };
 
    try {
      appList[params.id] = settings;
      await writeFile(pathJoin(this.dir, 'applications.json'), JSON.stringify(appList));      
    } catch (error) {
      throw new Error(`Can't write new applicatin settings to the application list: ${error}`);
    }

    let application: Application;
    try {
      application = await this.runApplication(params.id);
    } catch (error) {
      throw new Error(`Can't run new applicatin '${params.id}': ${error}`);
    }

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

  async runApplication(id: string, env?: Environments): Promise<Application> {

    let settings: ApplicationSettings
    
    try {
      settings = await this.getAppSettings(id, SECRET_KEY) as ApplicationSettings;
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
      let cubes: string[];
      
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
            cubes: getListOfCubes(settings.dirname),  
            mdStructure: result.mdStructure,
            enums: {},
            workspace: settings.workspace  
          });
          resolve(application);
        }
      }

      try { 
        application = new Application(id, settings, env, self, onReady);
        cubes = getListOfCubes(settings.dirname);
        // we register application to prevent loading another instance of one
        applications.set(id, { application, settings, cubes });
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

  async getAppSettings(id?: string, sekretKey?: string): Promise<ApplicationSettings | ApplicationSettings[]> {
    
    const appListFilename = pathJoin(this.dir, "applications.json");
    const appListFile     = fs.readFileSync(appListFilename, 'utf-8');
    const appList         = JSON.parse(appListFile);
    
    if(!id) {
      return appList;
    }

    const settings = appList[id]
    if(!settings) {
      return Promise.reject(`There is no an application with the id <${id}> in the list`)
    } else {
      settings.id = id
      return settings;
    }
  }

  destroy() {
    this.router.server.close()
    this.router.server = null
    this.router        = null
    this.communicator  = null
    this.applications  = null
  }
}

function initSettings(): CubismoSettings {

  const templates = {};
  const templateDefinitions = process.env.TEMPLATES.split(';');
  for(let templateDefinition of templateDefinitions) {
    const templateParams = templateDefinition.split('=');
    templates[templateParams[0]] = {
      dirname: templateParams[1]
    }
  }

  const settings: CubismoSettings = {
    port: Number(process.env.PORT) || 21021,
    host: process.env.HOST || '127.0.0.1',
    connection: {
      host: process.env.CON_HOST,
      port: Number(process.env.CON_PORT),
      database: process.env.CON_DATABASE,
      username: process.env.CON_USERNAME,
      password: process.env.CON_PASSWORD
    },
    defaults: {
      applications: {
        root: process.env.APP_ROOT,
        workspaces: process.env.APP_WORKSPACES
      },
      database: {
        host: process.env.DT_HOST,
        port: Number(process.env.DT_PORT),
        database: process.env.DT_DATABASE,
        username: process.env.DT_USERNAME,
        password: process.env.DT_PASSWORD
      }
    },
    templates
  }

  return settings;
}