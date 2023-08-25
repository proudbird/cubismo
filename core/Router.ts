import os from 'os';
import path from 'path';
import fs from 'fs';
import EventEmitter from 'events';
import http from 'http';
import express, { application } from 'express';
import cookieParser from 'cookie-parser';
import bodyParserFrom1C from 'bodyparser-1c-internal';
import jwt from 'jsonwebtoken';
import chalk from 'chalk';
import hyperlinker from 'hyperlinker';
import Cubismo from './Cubismo';
import Application from '../classes/application/Application';
import { NewApplicationParameters } from './types';
import auth from './Authenication';
import Logger from '../common/Logger';

import { Uimo } from 'uimo';
//@ts-ignore
// import Uimo from '../../uimo-pwa/controller/uimo';

export default class Router extends EventEmitter {
  #uimo: Uimo;
  public cubismo: Cubismo;

  public server: http.Server;

  constructor(cubismo: Cubismo) {
    super();
    this.cubismo = cubismo;
    this.#uimo = new Uimo({ pathToCubes: this.cubismo.settings.cubes });
  }

  async run(port: number, host: string): Promise<void> {
    const self = this;
    const router = express();
    router.use(express.json());
    router.use(cookieParser());
    router.use(bodyParserFrom1C);
    router.use(express.static(this.#uimo.static()));

    router.all('*', (req, res, next) => {
      // Logger.debug(`Income recquest: ${req.url}`);
      next();
    });

    router.get('/app/:applicationId', async (req, res, next) => {
      const { applicationId } = req.params;
      if (applicationId != 'favicon.ico') {
        if (applicationId == 'socket.io') {
          Logger.debug('Request for the socket.io');
        } else {
          let application: Application;
          try {
            application = await this.cubismo.runApplication(applicationId);
            Logger.debug('Gettin index page');
            res.send(this.#uimo.index());
          } catch (error) {
            Logger.error(`Unsuccessful attempt to run application '${applicationId}'`, error);
          }
        }
      }
    });

    

    router.get('/favicon.ico', (req, res, next) => {
      // Logger.debug('Request for the favicon')
    });

    router.get('/ping', (req, res, next) => {
      Logger.debug('checking instance');
      res.send({ server: 'cubismo', hostname: os.hostname() });
    });

    // router.get('/applist', function(req, res, next) {
    //   const list = []
    //   const appList = self.cubismo.getAppSettings();
    //   for(let key in appList) {
    //     list.push({ id: key, value: key })
    //   }
    //   res.send(list);
    // });

    router.post('/stop', this.cubismo.access.bind(this.cubismo), (req, res, next) => {
      Logger.info('Request on stopping server');
      try {
        self.cubismo.stop(req.query.key as string);
        res.send({ error: false });
      } catch (error) {
        res.status(500);
        res.send({ error: true, message: error.message });
      }
    });

    router.post('/add_app', this.cubismo.access.bind(this.cubismo), async (req, res, next) => {
      Logger.info('Request on adding new application');

      try {
        await self.cubismo.addApplication(req.body as any as NewApplicationParameters);
        res.send({ error: false });
      } catch (error) {
        res.status(500);
        res.send({ error: true, message: error.message });
      }
    });

    router.post('/reset_password', this.cubismo.access.bind(this.cubismo), async (req, res, next) => {
      const { applicationId, login, password } = req.body;

      if (!applicationId || !login || !password) {
        res.status(400).send({ error: true, message: 'Missing params' });
      }

      let application: Application;
      try {
        application = await this.cubismo.runApplication(applicationId);
      } catch (error) {
        res.status(500).send({ error: true, message: error.message });
      }

      try {
        const user = await application.users.findOne({ where: { login } });
        if (user) {
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

      if (!login || !password) {
        res.status(400).send({ error: true, message: 'Both login and password are required' });
      }

      let application: Application;
      try {
        const { applicationId } = req.params;
        application = await this.cubismo.runApplication(applicationId);
      } catch (error) {
        res.status(500).send({ error: true, message: error.message });
      }

      try {
        const user = await application.users.findOne({ where: { login } });
        Logger.debug(`We found user ${user.login}`);
        Logger.debug(JSON.stringify(self.cubismo.settings));
        if (user && (user.testPassword(password))) {
          const session = { userId: user.id, login, username: user.name, email: user.email };
          const token = jwt.sign(
            session,
            self.cubismo.settings.tokenKey,
            {
              expiresIn: '7d',
            },
          );
          Logger.debug(`We granted user ${user.login} with token`);
          const cookieTokenMaxAge = 1000 * 60 * 60 * 24 * 7;
          res.cookie('Bearer', token, { maxAge: cookieTokenMaxAge , httpOnly: true }).status(200).send({ error: false, data: session });
        } else {
          res.status(400).send({ error: true, message: 'Invalid Credentials' });
        }
      } catch (error) {
        res.status(500).send({ error: true, message: error.message });
      }
    });

    router.get('/app/:applicationId/session', async (req, res, next) => {
      function handler(req, res, session) {
        res.status(200).send({ error: false, data: session });
      }

      authControl(self.cubismo.settings.tokenKey, req, res, next, handler);
    });

    async function authControl(tokenKey: string, req, res, next, handler) {
      let application: Application;
      try {
        const { applicationId } = req.params;
        application = await self.cubismo.runApplication(applicationId);
        // Logger.debug(`Application is running: ${application.id}`);
      } catch (error) {
        Logger.warn(`Error on running app: ${error.message}`);
        return res.status(500).send({ error: true, message: error.message });
      }

      // Logger.debug('Going to authenication');
      await auth(application, tokenKey, req, res, next, handler);
    }

    router.post('/app/:applicationId/check_authentication', async (req, res, next) => {
      function handler(req, res) {
        res.status(200).send({ error: false });
      }

      authControl(self.cubismo.settings.tokenKey, req, res, next, handler);
    });

    router.all('/app/:applicationId/api/*', async (req, res, next) => {
      const { applicationId } = req.params;
      let application: Application;
      try {
        application = await this.cubismo.runApplication(applicationId);
      } catch (error) {
        return res.status(404).send({ error: true, message: error.message });
      }

      const request = req.params[0];

      if (!application.getApiHandler(request)) {
        Logger.debug(`API request '${request}' is not registered`);
        return res.status(404).send({ error: true, message: `API request '${request}' is not registered` });
      }

      const { handler, needAuthenication } = application.getApiHandler(request);

      const commonHandler = application.getApiHandler('*');
      if (commonHandler) {
        commonHandler.handler(req, res, handler);
      } else if (needAuthenication) {
        try {
          // Logger.debug('Going to handler');
          authControl(self.cubismo.settings.tokenKey, req, res, next, handler);
        } catch (error) {
          res.status(500).send({ error: true, message: error.message });
        }
      } else {
        try {
          Logger.debug('Going to next');
          handler(req, res, next);
        } catch (error) {
          res.status(500).send({ error: true, message: error.message });
        }
      }
    });

    router.get('/app/:applicationId', async (req, res, next) => {
      Logger.debug(`Going to load index page`);
      let view: any;
      try {
        view = await this.#uimo.index();
      } catch (error) {
        Logger.warn(`Error on loading index page: ${error.message}`);
        return res.status(500).send(error.message);
      }
      res.status(200).send(view);
    });

    router.post('/app/:applicationId/init', async (req, res, next) => {
      Logger.debug(`Going to init client side application`);
      let application: Application;
      const { applicationId } = req.params;
      try {
        application = await this.cubismo.runApplication(applicationId);
      } catch (error) {
        res.status(500).send({ error: true, message: error.message });
      }

      if(application.appStructure) {
        return res.status(200).send(application.appStructure);
      }
      const appSettings = this.cubismo.applications.get(applicationId).settings;
      let appStructure: any;
      try {
        appStructure = await this.#uimo.initApp({ appId: applicationId, cubesDir: this.cubismo.settings.cubes, appCubes: appSettings.cubes });
        application.appStructure = appStructure;
      } catch (error) {
        Logger.warn(`Error on initing client side application: ${error.message}`);
        return res.status(500).send(error.message);
      }
      res.status(200).send(appStructure); 
    });

    router.get('/app/:applicationId/cube/:cubeId', async (req, res, next) => {
      Logger.debug(`Going to load module ${req.params.cubeId}`);
      let application: Application;
      const { applicationId } = req.params;
      try {
        application = await this.cubismo.runApplication(applicationId);
      } catch (error) {
        res.status(500).send({ error: true, message: error.message });
      }

      const { cubeId } = req.params;
      let module: any;
      
      try {
        const moduleFilename = application.appStructure.cubes[cubeId];
        module = await this.#uimo.loadModule(cubeId.split('.')[0], moduleFilename, cubeId); 
      } catch (error) {
        Logger.warn(`Error on loading module: ${error.message}`);
        return res.status(500).send(error.message);
      }
      res.status(200).setHeader('Content-Type', 'application/javascript').send(module);
    });

    router.get('/app/:applicationId/module/:moduleId', async (req, res, next) => {
      Logger.debug(`Going to load module ${req.params.moduleId}`);
      const { moduleId } = req.params;
      let module: any;
      const { applicationId } = req.params;
      const application = this.cubismo.applications.get(applicationId);
      console.log(moduleId)
      try {
        const moduleFilename = application.appStructure.modules[moduleId];
        module = await this.#uimo.loadModule(moduleId.split('.')[0], moduleFilename, moduleId); 
      } catch (error) {
        Logger.warn(`Error on loading module: ${error.message}`);
        return res.status(500).send(error.message);
      }
      res.status(200).setHeader('Content-Type', 'application/javascript').send(module);
    });

    router.get('/app/:applicationId/view/:viewId', async (req, res, next) => {
      Logger.debug(`Going to load view ${req.params.viewId}`);
      const { viewId } = req.params;
      let view: any;
      try {
        view = await this.#uimo.loadView(this.cubismo.settings.cubes, viewId);
      } catch (error) {
        Logger.warn(`Error on loading view: ${error.message}`);
        return res.status(500).send(error.message);
      }
      res.status(200).send(view);
    });

    router.post('/app/:applicationId/instance', async (req, res, next) => {
      const { applicationId } = req.params;
      let application: Application;
      try {
        application = await this.cubismo.runApplication(applicationId);
      } catch (error) {
        return res.status(404).send({ error: true, message: error.message });
      }

      const { cube, className, object, method, args } = req.body;

      const handler = application.cubes[cube][className][object][method];
      if (!handler) {
        return res.status(404).send({ error: true, message: `Method ${method} is not registered` });
      }
      const thisObject = application.cubes[cube][className][object];
      const result = await handler.call(thisObject, ...args);
      res.status(200).send(result);
    });

    return new Promise((resolve, reject) => {
      this.server = router.listen(port, host, async () => {
        const link = `http://${host}:${port}`;
        const raw = `cubismo server is listening at ${link}`;
        const message = `${chalk.green.bold('cubismo')} server is listening at ${chalk.blue.underline(hyperlinker(link, link))}`;
        const border = '════════════════════════════════════════════════════════════════════'
          .slice(0, raw.length + 4);
        const space = '                                                                      '
          .slice(0, raw.length);
        console.log('');
        console.log(`╔${border}╗`);
        console.log(`║  ${space}  ║`);
        console.log(`║  ${message}  ║`);
        console.log(`║  ${space}  ║`);
        console.log(`╚${border}╝`);
        resolve();
      });
    });
  }
}

function windowTemplate() {
  const fileName = path.join(__dirname, '../client/window.html');
  return fs.readFileSync(fileName, 'UTF-8' as null);
}

function onSessionStart(application) {
  if (application.onSessionStart) {
    application.onSessionStart();
  }

  for (const cube of application.cubes) {
    if (cube.onSessionStart) {
      cube.onSessionStart();
    }
  }
}
