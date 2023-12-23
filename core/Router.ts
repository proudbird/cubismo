import os from 'os';
import path from 'path';
import fs from 'fs';
import EventEmitter from 'events';
import http from 'http';
import express, { Request, application } from 'express';
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

import { getModelList } from '../database/getModelList';
import { saveInstance } from '../database/saveInstance';
import { DataBaseModel, StandardModelDefinition } from '../database/types';
//@ts-ignore
// import Uimo from '../../uimo-pwa/controller/uimo';

type RequestExtraParams = {
  applicationId: string;
  application: Application;
}

type AppRequest = Request & RequestExtraParams;

export default class Router extends EventEmitter {
  public cubismo: Cubismo;

  public server: http.Server;

  constructor(cubismo: Cubismo) {
    super();
    this.cubismo = cubismo;
  }

  async run(port: number, host: string): Promise<void> {
    const self = this;
    const router = express();
    router.use(express.json());
    router.use(cookieParser());
    router.use(bodyParserFrom1C);
    router.use(express.static(this.cubismo.getUIStaticPath()));

    router.get('/favicon.ico', (req, res, next) => {
      // Logger.debug('Request for the favicon')
    });

    router.get('/ping', (req, res, next) => {
      Logger.debug('checking instance');
      res.send({ server: 'cubismo', hostname: os.hostname() });
    });

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

    router.use('/app', async (req: AppRequest, res, next) => {
      const applicationId = req.url.split('/')[1];
      req.applicationId = applicationId;

      try {
        const application = await this.cubismo.runApplication(applicationId);
        req.application = application;
        next();
      } catch (error) {
        res.status(500).send({ error: true, message: error.message });
      }
    });

    router.get('/app/:applicationId', async (req: AppRequest, res, next) => {
      Logger.debug(`Going to load index page`);

      try {
        const view = this.cubismo.getIndexPage(req.applicationId);

        res.status(200).send(view);
      } catch (error) {
        Logger.warn(`Error on loading index page: ${error.message}`);

        return res.status(500).send(error.message);
      }
    });

    router.post('/app/:applicationId/init', async (req: AppRequest, res, next) => {
      Logger.debug(`Going to init client side application`);

      const appStructure = this.cubismo.getAppStructure(req.applicationId);
      return res.status(200).send(appStructure);
    });

    router.get('/app/:applicationId/cube/:cubeId', async (req: AppRequest, res, next) => {
      const { cubeId } = req.params;

      Logger.debug(`Going to load cube module ${cubeId}`);

      const appStructure = this.cubismo.getAppStructure(req.applicationId);

      try {
        const moduleFilename = appStructure.cubes[cubeId].clientModule;
        const module = await this.cubismo.loadClientModule(cubeId, moduleFilename, cubeId);

        res.status(200).setHeader('Content-Type', 'application/javascript').send(module);
      } catch (error) {
        Logger.warn(`Error on loading cube module <${cubeId}>: ${error.message}`);

        return res.status(500).send(error.message);
      }
    });

    router.get('/app/:applicationId/module/:moduleId', async (req: AppRequest, res, next) => {
      Logger.debug(`Going to load module ${req.params.moduleId}`);

      const { moduleId } = req.params;

      const appStructure = this.cubismo.getAppStructure(req.applicationId);

      let cubeName: string;
      let moduleName: string;

      try {
        const moduleIdParts = moduleId.split('.');
        cubeName = moduleIdParts[0];
        moduleName = moduleIdParts[1];
      } catch (error) {
        Logger.warn(`Error on parsing module ID <${moduleId}>: ${error.message}`);
        return res.status(500).send(error.message);
      }

      try {
        const moduleFilename = appStructure.cubes[cubeName][moduleName].clientModule;
        const module = await this.cubismo.loadClientModule(cubeName, moduleFilename, moduleId); 

        res.status(200).setHeader('Content-Type', 'application/javascript').send(module);
      } catch (error) {
        Logger.warn(`Error on loading module <${moduleId}>: ${error.message}`);

        return res.status(500).send(error.message);
      }
    });

    router.get('/app/:applicationId/view/:viewId', async (req, res, next) => {
      Logger.debug(`Going to load view ${req.params.viewId}`);
      const { viewId } = req.params;

      try {
        const view = await this.cubismo.loadView(viewId);

        res.status(200).send(view);
      } catch (error) {
        Logger.warn(`Error on loading view: ${error.message}`);

        return res.status(500).send(error.message);
      }
    });

    router.post('/app/:applicationId/method', async (req: AppRequest, res, next) => {
      const { cube, className, object, method, args } = req.body;

      const handler = req.application.cubes[cube][className][object][method];
      if (!handler) {
        return res.status(404).send({ error: true, message: `Method ${method} is not registered` });
      }
      const thisObject = req.application.cubes[cube][className][object];
      const result = await handler.call(thisObject, ...args);
      res.status(200).send(result || {});
    });

    router.post('/app/:applicationId/instance', async (req: AppRequest, res, next) => {
      const id = req.body.options.where.id;

      if (!id) {
        const { cube, className, model } = req.body;
        const modelAlias = `${cube}.${className}.${model}`;

        const dbDriver = this.cubismo.applications.get(req.applicationId).dbDriver.connection;

        const modelDefinition = (dbDriver.models[modelAlias] as unknown as DataBaseModel).definition;
        const attributes = {
          Code: {
            index: 0,
            name: 'Code',
            title: 'Code',
            type: { dataType: 'STRING' }
          },
          Name: {
            index: 1,
            name: 'Name',
            title: 'Name',
            type: { dataType: 'STRING' }
          }
        };

        let index = 2;
        for(let [attrName, attribute] of Object.entries((modelDefinition as StandardModelDefinition).attributes)) {
          const type = attribute.type as any;
          if(type.reference.cube === 'this') {
            type.cube = modelDefinition.cube;
          } else {
            type.cube = type.reference.cube;
          }
          type.className = type.reference.class;
          type.model = (dbDriver.models[type.reference.modelId] as unknown as DataBaseModel).definition.name;

          attributes[attrName] = {
            index: index++,
            name: attrName,
            title: attribute.title,
            type
          }
        }

        return res.status(200).send({ error: false, data: { attributes, entries: [] } });
      }

      req.body.options.where = {
        [`${req.body.model}.Reference`]: { id }
      };

      try {
        const dbDriver = this.cubismo.applications.get(req.applicationId).dbDriver.connection;
        const result = await getModelList(req.application, dbDriver, req.body);
        if (result.error) {
          res.status(500).send(result);
        } else {
          res.status(200).send(result);
        }
      } catch (error) {
        res.status(500).send({ error: true, message: error.message });
      }
    });

    router.post('/app/:applicationId/list', async (req: AppRequest, res, next) => {

      try {
        const dbDriver = this.cubismo.applications.get(req.applicationId).dbDriver.connection;
        const result = await getModelList(req.application, dbDriver, req.body);
        if (result.error) {
          res.status(500).send(result);
        } else {
          res.status(200).send(result);
        }
      } catch (error) {
        res.status(500).send({ error: true, message: error.message });
      }
    });

    router.post('/app/:applicationId/save', async (req: AppRequest, res, next) => {

      try {
        const dbDriver = this.cubismo.applications.get(req.applicationId).dbDriver.connection;
        const result = await saveInstance(req.application, dbDriver, req.body);
        if (result.error) {
          res.status(500).send(result);
        } else {
          res.status(200).send(result);
        }
      } catch (error) {
        res.status(500).send({ error: true, message: error.message });
      }
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
