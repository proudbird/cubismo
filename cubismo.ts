import "./core/Utils";
import "./Logger";
import "./Errors/Uncaught";
import fs   from 'fs'
import path from 'path'
import Logger from './Logger';
import Router       from "./Router.js"
import Communicator from './Communicator'
import Application, { AppSettings }  from "./classes/application/Application"
import { MetaDataClassDefinitions } from './classes/MetaData'

import { AddIn, loadAddIns } from './AddIns'


let SECRET_KEY: string

export declare type ApplicationProperties = {
  application: Application,
  [key: string]: any
}

export default class Cubismo {

  #port         : number = 21021;
  #dirname      : string = __dirname;
  #applications : Map<string, ApplicationProperties>
  #addIns       : Map<string, AddIn>
  enums        : WeakMap<Application, EnumStore> 
  applicationCubes: Map<string, string[]>;

  #router: Router
  #communicator: Communicator

  constructor(port?: number, path?: string, sekretKey?: string) {
    SECRET_KEY    = sekretKey;
    this.#port    = port || this.#port;
    this.#dirname = path || this.#dirname;
    this.#applications = new Map;
    this.#addIns = new Map;
    this.enums = new WeakMap;
    this.applicationCubes = new Map;
  }

  get port(): number {
    return this.#port;
  }
  
  get path(): string {
    return this.#dirname;
  }

  get applications(): Map<string, IApplication> {
    return this.#applications;
  }

  async start(applicationId: string): Promise<void> {
    this.#router = new Router()

    if(applicationId) {
      this.runApplication(applicationId)
    }

    const self = this
    this.#router.on("connect", async function(res, applicationId) {
      let application: Application
      try {
        Logger.debug(self.path)
        application = await self.runApplication(applicationId)
        res.send(windowTemplate())
        setTimeout(onSessionStart, 1000, application)
      } catch(err) {
        Logger.error(`Unsuccessful attempt to run application '${applicationId}': ${err}`)
      }
    })

    this.#router.on('applist', async function(callback) {
      const list = []
      const settings = await self.getAppSettings()
      for(let key in settings) {
        list.push({ id: key, value: key })
      }
      callback(list)
    })

    this.#router.on('stop', async function(res, key) {
      function exit() {
        process.exit()
      }
      if(key === SECRET_KEY) {
        res.send({ error: false })
        Logger.info(`cubismo server is stopped`)
        // we need some delay to show notification
        setTimeout(exit, 500)
      } else {
        res.send({ error: true, errorMessage: `Wrong key` })
        Logger.info(`wrong key`)
      }
    })

    function windowTemplate() {
      const fileName = path.join(__dirname, '../client/window.html')
      return fs.readFileSync(fileName, 'UTF-8' as null)
    }

    function onSessionStart(application) {
      if(application['onSessionStart']) {
        application['onSessionStart']();
      }

      for(let cube of application.cubes) {
        if(cube['onSessionStart']){
          cube['onSessionStart']();
        }
      }
    }

    this.#communicator = new Communicator(this.#router.server, this.#applications)

    await loadAddIns(this, this.#addIns)

    return this.#router.run(this.port)
  }

  async runApplication(id: string): Promise<Application> {

    let settings: AppSettings
    
    try {
      settings = await this.getAppSettings(id, SECRET_KEY)
      Logger.debug(`Application <${id}> is found in the list`)
    } catch (err) {
      return Promise.reject(settings)
    }

    const applications = this.#applications
    const self = this

    return new Promise<Application>((resolve, reject) => {
      if(applications.has(id)) {  // app is defined already
        Logger.debug(`Application <${id}> is running already`)
        return resolve(applications.get(id).application)
      }

      let application: Application
      try { 
        application = new Application(settings, self)
      } catch(err) {
        return reject(err)
      }

      application.on('initialized', (metaDataStructure: MetaDataClassDefinitions) => {
        applications.set(id, { application, dirname: settings.dirname, metaDataStructure, courier: undefined, views: {} })
        return resolve( application)
      })

      application.emit('initialize')
    })
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

  async getAppSettings(id?: string, sekretKey?: string): Promise<any> {
    
    Logger.debug(this.#dirname)
    const appListFilename = path.join(this.#dirname, "applications.json")
    Logger.debug(appListFilename)
    const appListFile     = fs.readFileSync(appListFilename, 'UTF-8' as null) 
    const appList         = JSON.parse(appListFile as unknown as string)
    
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