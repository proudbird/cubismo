import "../common/Utils";
import "../common/Logger";
import "../errors/Uncaught";
import fs   from 'fs'
import { join as pathJoin} from 'path';

import validator from "validator";

import Logger from '../common/Logger';
import Router       from "./Router.js"
import Communicator from './Communicator'
import Application, { AppSettings }  from "../classes/application/Application"
import { MetaDataClassDefinitions } from '../classes/MetaData'

import { AddIn, loadAddIns } from './AddIns'
import initApplicationSpace from "./initApplicationSpace";
import initDatabase from "./initDatabase";
import { Applications, ApplicationSettings, CubismoSettings, EnumStore } from "./types";
import getListOfCubes from "../classes/application/getListOfCubes";

let SECRET_KEY: string;

export default class Cubismo {

  public port        : number;
  public dir         : string;
  public settings    : CubismoSettings;
  public applications: Map<string, Applications>;
  public addIns      : Map<string, AddIn>; 
  public router      : Router
  public communicator: Communicator

  constructor(sekretKey?: string) {
    SECRET_KEY        = sekretKey;

    const settingsFilename = pathJoin(this.dir, "settings.json");
    const settingsFile     = fs.readFileSync(settingsFilename, 'utf-8');

    this.settings     = JSON.parse(settingsFile);
    this.port         = this.settings.port || 21021;
    this.dir          = __dirname;
    this.applications = new Map;
    this.addIns       = new Map;
  }

  async start(applicationId: string): Promise<void> {
    
    this.router = new Router(this);

    if(applicationId) {
      this.runApplication(applicationId);
    }

    this.communicator = new Communicator(this.router.server, this.applications);

    await loadAddIns(this);

    this.router.run(this.port)
  }

  addApplication(settings: AppSettings): void {
    
  }

  async runApplication(id: string): Promise<Application> {

    let settings: ApplicationSettings
    
    try {
      settings = await this.getAppSettings(id, SECRET_KEY);
      Logger.debug(`Application <${id}> is found in the list`);
    } catch (err) {
      return Promise.reject(settings);
    }

    const applications = this.applications;
    const self = this;

    if(applications.has(id)) {  // app is defined already
      Logger.debug(`Application <${id}> is running already`);
      return applications.get(id).application;
    }
    
    return new Promise<Application>((resolve, reject) => {
      
      let application: Application;
      
      function onReady(error: Error) {
        if(error) {
          reject(new Error(`Can't run application '${id}': ${error.message}`));
        } else {
          cubismo.applications.set(this.#id, { 
            application: this, 
            settings, 
            cubes: getListOfCubes(settings.dirname),  
            mdStructure,
            enums: {}  
          });
          resolve(application);
        }
      }

      try { 
        application = new Application(settings, self, onReady);
      } catch(error) {
        return reject(error);
      }
    });
  }

  stopApplication(id: string): boolean {
    try {
      this.#applications.delete(id);
      return true;
    } catch(error) {
      Logger.error(`Can't find an appplication '${id}' among runnin applications`, error);
      return false;
    }
  }

  async getAppSettings(id?: string, sekretKey?: string): Promise<ApplicationSettings> {
    
    const appListFilename = pathJoin(this.dir, "applications.json")
    const appListFile     = fs.readFileSync(appListFilename, 'UTF-8' as null) 
    const appList         = JSON.parse(appListFile as unknown as string).applications;
    
    if(!id) {
      return Promise.resolve(appList)
    }

    const settings = appList[id]
    if(!settings) {
      return Promise.reject(`There is no an application with the id <${id}> in the list`)
    } else {
      settings.id = id
      return Promise.resolve(settings)
    }
  }

  destroy() {
    this.#router.server.close()
    this.#router.server = null
    this.#router        = null
    this.#communicator  = null
    this.#applications  = null
  }
}