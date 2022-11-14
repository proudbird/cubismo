import os from 'os';
import path from 'path';
import fs from 'fs';
import EventEmitter from 'events';
import http from 'http';
import express from 'express';
import bodyParserFrom1C from 'bodyparser-1c-internal';
import jwt from 'jsonwebtoken';
import chalk from 'chalk';
import hyperlinker from 'hyperlinker';
import Cubismo from './Cubismo';
import Application from '../classes/application/Application';
import { NewApplicationParameters } from './types';
import auth from './Authenication';
import Logger from '../common/Logger';
import { parse } from 'yaml'

import * as swc from '@swc/core';

//@ts-ignore
import uimo from 'uimo';

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
    router.use(bodyParserFrom1C);
    router.use(express.static(uimo.static()));

    router.all('*', (req, res, next) => {
      Logger.debug(`Income request: ${req.url}`);
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
            res.send(windowTemplate());
            setTimeout(onSessionStart, 1000, application);
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
          const token = jwt.sign(
            { userId: user.id, login },
            self.cubismo.settings.tokenKey,
            {
              expiresIn: '7d',
            },
          );
          Logger.debug(`We granted user ${user.login} with token`);
          res.status(200).send({ error: false, data: token });
        } else {
          res.status(400).send({ error: true, message: 'Invalid Credentials' });
        }
      } catch (error) {
        res.status(500).send({ error: true, message: error.message });
      }
    });

    router.post('/app/:applicationId/check_authentication', async (req, res, next) => {
      function handler(req, res) {
        res.status(200).send({ error: false });
      }

      authControl(self.cubismo.settings.tokenKey, req, res, next, handler);
    });

    const cache = {};

    router.get('/app/:applicationId/views/:viewId', async (req, res, next) => {
      const { viewId } = req.params;
      cache[viewId] = cache[viewId] || {};
      const p = uimo.view('Window');

      if(viewId.includes('.js.map')) {
        return res.status(200).send(cache[viewId].map);
      }
      if(viewId === 'Window.js') {
        
        if(cache[viewId].code) {
          Logger.debug(`cache compile`);
          return res.status(200).send(cache[viewId].code);
        }

        const source = fs.readFileSync(p, 'utf8');
        Logger.debug(`Start compile`);
        swc.transform(`var a = 0;${source}`, {
          filename: `../../../${viewId.replace('.js', '.ts')}`,
          sourceMaps: true,
          module: {
            type: "commonjs"
          },
          isModule: true,
          jsc: {
            parser: {
              syntax: "typescript",
            },
            transform: {},
          },
        }).then((output: any) => {
          const config = parse(fs.readFileSync(p.replace('.ts', '.yaml'), 'utf8'));
          const result = `(() => { const exports = { __config: ${JSON.stringify(config)} }; window.views["${viewId.replace('.js', '')}"] = exports; ((exports) => { ${output.code.replace('var a = 0;','')} })(exports);})();//# sourceMappingURL=${viewId.replace('.js', '')}.js.map`;
          //fs.writeFileSync(p.replace('.ts', '.js.map'), output.map.replace('var a = 0;',''), 'utf8');
          
          cache[viewId].code = result;
          cache[viewId].map = output.map.replace('var a = 0;','');
          res.status(200).send(result);
          Logger.debug(`Stop compile`);
        });
      }
      
    });

    async function authControl(tokenKey: string, req, res, next, handler) {
      let application: Application;
      try {
        const { applicationId } = req.params;
        application = await self.cubismo.runApplication(applicationId);
        Logger.debug(`Application is running: ${application.id}`);
      } catch (error) {
        Logger.warn(`Error on running app: ${error.message}`);
        return res.status(500).send({ error: true, message: error.message });
      }

      Logger.debug('Going to authenication');
      await auth(application, tokenKey, req, res, next, handler);
    }

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
          Logger.debug('Going to handler');
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
      uimo.watch(this.server, this.cubismo.settings.cubes);
    });
  }
}

function windowTemplate() {
  return uimo.window();
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
