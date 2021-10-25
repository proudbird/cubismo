import os from 'os'
import path         from 'path'
import fs   from 'fs'
import EventEmitter from 'events'
import http         from 'http'
import express  from 'express'
import bodyParserFrom1C from "bodyparser-1c-internal";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken"
import Cubismo from './Cubismo'
import Application from '../classes/application/Application';
import { Applications, NewApplicationParameters } from './types'
import auth from "./Authenication";
import access from "./AdminAccess";


export default class Router extends EventEmitter {

  #cubismo: Cubismo;
  public server: http.Server

  constructor(cubismo: Cubismo) {
    super();
    this.#cubismo = cubismo;
  }

  async run (port: number, host: string): Promise<void> {

    const self = this
    const router = express();
    router.use(express.json());
    router.use(bodyParserFrom1C);
    router.use(express.static(path.join(__dirname, '../client/')))

    router.get('/app/:applicationId', async (req, res, next) => {

      const applicationId = req.params.applicationId
      if(applicationId != 'favicon.ico') {
        if(applicationId == 'socket.io') {
          Logger.debug('Request for the socket.io')
        } else {
          let application: Application;
          try {
            application = await this.#cubismo.runApplication(applicationId);
            res.send(windowTemplate())
            setTimeout(onSessionStart, 1000, application)
          } catch(error) {
            Logger.error(`Unsuccessful attempt to run application '${applicationId}'`, error)
          }
        }
      }
    })

    router.get('/favicon.ico', function(req, res, next) {
      //Logger.debug('Request for the favicon')
    })

    router.get('/ping', function(req, res, next) {
      Logger.debug('checking instance')
      res.send({server: 'cubismo', hostname: os.hostname()})
    });

    router.get('/applist', function(req, res, next) {
      const list = []
      const appList = self.#cubismo.getAppSettings();
      for(let key in appList) {
        list.push({ id: key, value: key })
      }
      res.send(list);
    });

    router.post('/stop', access, function(req, res, next) {

      Logger.info(`Request on stopping server`);
      try {
        self.#cubismo.stop(req.query.key as string);
        res.send({ error: false });
      } catch (error) {
        res.status(500);
        res.send({ error: true, message: error.message });
      }
    });

    router.post('/add_app', access, async function(req, res, next) {

      Logger.info(`Request on adding new application`);

      try {
        await self.#cubismo.addApplication(req.body as any as NewApplicationParameters);
        res.send({ error: false });
      } catch (error) {
        res.status(500);
        res.send({ error: true, message: error.message });
      }
    });

    router.post('/reset_password', access, async (req, res, next) => {

      const { applicationId, login, password } = req.body;

      if(!applicationId || !login || !password) {
        res.status(400).send({ error: true, message: `Missing params` });
      }

      let application: Application;
      try {
        application = await this.#cubismo.runApplication(applicationId);
      } catch (error) {
        res.status(500).send({ error: true, message: error.message });
      }

      try {
        const user = await application.users.findOne({ where: { login }});
        if(user) {
          user.password = password;
          await user.save();
          res.status(200).send({ error: false });
        } else {
          res.status(400).send({ error: true, message: `User with login ${login} not found` });
        }
      } catch (error) {
        res.status(500).send({ error: true, message: error.message });
      }
    });

    router.post('/app/:applicationId/login', async (req, res, next) => {
      const { login, password } = req.body;

      if(!login || !password) {
        res.status(400).send({ error: true, message: `Both login and password are required` });
      }

      let application: Application;
      try {
        const applicationId = req.params.applicationId
        application = await this.#cubismo.runApplication(applicationId);
      } catch (error) {
        res.status(500).send({ error: true, message: error.message });
      }

      try {
        const user = await application.users.findOne({ where: { login }});
        Logger.debug(`We found user ${user.login}`);
        if(user && (user.testPassword(password))) {
          const token = jwt.sign(
            { userId: user.id, login },
            process.env.TOKEN_KEY,
            {
              expiresIn: "7d",
            }
          );
          Logger.debug(`We granted user ${user.login} with token`);
          res.status(200).send({ error: false, data: token });
        } else {
          res.status(400).send({ error: true, message: `Invalid Credentials` });
        }
      } catch (error) {
        res.status(500).send({ error: true, message: error.message });
      }
    });
    
    router.post('/app/:applicationId/check_authentication', async (req, res, next) => {

      function handler(req, res) {
        res.status(200).send({ error: false });
      }

      authControl(req, res, next, handler);
    });

    async function authControl(req, res, next, handler) {
      
      let application: Application;
      try {
        const applicationId = req.params.applicationId
        application = await self.#cubismo.runApplication(applicationId);
        Logger.debug(`Application is running: ${application.id}`);
      } catch (error) {
        Logger.warn(`Error on running app: ${error.message}`);
        return res.status(500).send({ error: true, message: error.message });
      }

      Logger.debug(`Going to authenication`);
      await auth(application, req, res, next, handler);
    }

    router.all('/app/:applicationId/api/*', async (req, res, next) => {

      const applicationId = req.params.applicationId
      let application: Application;
      try {
        application = await this.#cubismo.runApplication(applicationId);
      } catch (error) {
        return res.status(404).send({ error: true, message: error.message });
      }

      const request = req.params[0];

      if(!application.getApiHandler(request)) {
        Logger.debug(`API request '${request}' is not registered`);
        return next();
      }

      const { handler, needAuthenication } = application.getApiHandler(request);

      const commonHandler = application.getApiHandler('*');
      if(commonHandler) {
        commonHandler.handler(req, res, handler);
      } else {

        if(needAuthenication) {
          try {
            Logger.debug(`Going to handler`);
            authControl(req, res, next, handler);
          } catch (error) {
            res.status(500).send({ error: true, message: error.message });
          }
        } else {
          try {
            Logger.debug(`Going to next`);
            handler(req, res, next);
          } catch (error) {
            res.status(500).send({ error: true, message: error.message });
          }
        }
      }
    });

    return new Promise((resolve, reject) => {
      this.server = router.listen(port, host, function() {  
        Logger.info(`cubismo server is listening at ${host}:${port}`)
        resolve()
      })
    })
  }
}

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