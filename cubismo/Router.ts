import os from 'os'
import path         from 'path'
import EventEmitter from 'events'
import http         from 'http'
import express      from 'express'
import bodyParserFrom1C from "bodyparser-1c-internal";
import Cubismo from './Cubismo'


export default class Router extends EventEmitter {

  #cubismo: Cubismo;
  public server: http.Server

  constructor(cubismo: Cubismo) {
    super();
    this.#cubismo = cubismo;
  }

  async run (port: number): Promise<void> {

    const self = this
    const router = express();
    router.use(express.json());
    router.use(bodyParserFrom1C);
    router.use(express.static(path.join(__dirname, '../client/')))

    router.get('/app/:applicationId', async function(req, res, next) {

      const applicationId = req.params.applicationId
      if(applicationId != 'favicon.ico') {
        if(applicationId == 'socket.io') {
          Logger.debug('Request for the socket.io')
        } else {
          self.emit("connect", res, applicationId)
        }
      }
    })

    router.get('/favicon.ico', function(req, res, next) {
      //Logger.debug('Request for the favicon')
    })

    router.get('/ping', function(req, res, next) {
      Logger.debug('checking instance')
      res.send({server: 'cubismo', hostname: os.hostname()})
    })
    router.get('/applist', function(req, res, next) {
      self.emit('applist', function(list: any) {
        res.send(list)
      })
    })
    router.post('/stop', function(req, res, next) {
      Logger.info(`request on stopping server`)
      self.emit('stop', res, req.query.key)
    })

    router.post('/get_access_code', function(req, res, next) {
      handleApiRequest(self, req, res, next)
    });

    router.post('/verify', function(req, res, next) {
      self.emit('verify', req.body, function(result) {
        if(result.error) {
          res.statusCode = result.statusCode;
        }
        res.send(result);
      })
    });

    router.post('/add_app', function(req, res, next) {
      self.emit('addApplication', req.body, function(result) {
        if(result.error) {
          res.statusCode = result.statusCode;
        }
        res.send(result);
      })
    });

    router.all('/app/:applicationId/api/*', function(req, res, next) {
      self.emit('api', req.params.applicationId, req.params, req.body, req.method, function(result) {
        res.send(result);
      })
    });

    function handleApiRequest(router, req, res, next) {
      router.emit(req.originalUrl.replace('/', ''), req.body, function(result) {
        if(result.error) {
          res.statusCode = result.statusCode;
        }
        res.send(result);
      });
    }

    return new Promise((resolve, reject) => {
      this.server = router.listen(port, function() {  
        Logger.info(`cubismo server is listening at port ${port}`)
        resolve()
      })
    })
  }
}

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
});

this.#router.on('get_access_code', async function(data, callback) {
  if(!validator.isEmail(data.email)) {
    return callback({ error: true, message: `Wrong email adress '${data.email}'`, statusCode: 421 });
  }
  if(!validator.isAlphanumeric(data.companyName) || !data.companyName.match(/^[a-z]/i)) {
    return callback({ error: true, message: `Company name may be consist of latin leters and digits and can start from letter only`, statusCode: 422 });
  }
  if(!validator.isAlphanumeric(data.login) || !data.login.match(/^[a-z]/i)) {
    return callback({ error: true, message: `Login may be consist of latin leters and digits and can start from letter only`, statusCode: 423 });
  }
  const accessCode = Verification.generateCode(data.email);
  try {
    const args = { accessCode, companyName: data.companyName };
    const text = await self.mail.template('verify.txt', args);
    const html = await self.mail.template('verify.html', args);
    const info = await self.mail.send({
      from: `${self.settings.name} <${self.settings.postman.auth.user}>`,
      to: data.email,
      subject: `Одноразовый код доступа к ${self.settings.name}`,
      text,
      html
    }); 
    callback({ error: false });
  } catch (error) {
    callback({ error: true, message: `Can't send access code to ${data.email}`, statusCode: 500 });
  }
});

this.#router.on('addApplication', async (params, callback) => {

  if(this.settings.applications[params.name]) {
    const error = new Error(`Applicaton with name '${params.name}' allready exists`);
    Logger.warn(error.message);
    return callback({ error: true, message: error.message, statusCode: 409 });
  }

  const appDirname = pathJoin(this.settings.defaults.application.root, params.name);
  const appWorkspace = pathJoin(this.settings.defaults.application.workspaces, params.name);
  const databaseName = 'db_' + Utils.sid().toLowerCase();
  const username = "optima";
  const password = "<35{%rta)9^vjNuc";

  let error = await initApplicationSpace(
    this.settings.templates.optima.dirname, 
    appDirname, 
    appWorkspace
    );
  if(error) {
    Logger.warn(error.message);
    return callback({ error: true, message: error.message, statusCode: 500 });
  }
  error = await initDatabase(this.settings.defaults.database, databaseName, username, password);
  if(error) {
    Logger.warn(error.message);
    return callback({ error: true, message: error.message, statusCode: 500 });
  }

  const settings: AppSettings = {
    id: params.name,
    dirname:  appDirname,
    workspace: appWorkspace,
    dbconfig: {
      database: databaseName,
      username: username,
      password: password,
      options: {
        host: "127.0.0.1",
        dialect: "postgres",
        logging: false
      }
    }
  };

  const self = this;
  async function end() {
    try{
      self.settings.applications[params.name] = settings;
      fs.writeFileSync(self.settings, JSON.stringify(self.settings));

      const application = await self.runApplication(params.name);
      const newUser = application.users.new();
      newUser.name     = params.username;
      newUser.login    = params.login;
      newUser.email    = params.email;
      newUser.password = params.password;
      await newUser.save();
    } catch(error) {
      return callback({ error: true, message: error.message, statusCode: 500 });
    }

    callback({ error: false });
  }

  setTimeout(end, 1000*3); 
})

this.#router.on('api', async function(applicationId, params, body, method, callback) {
  let application: Application;
  try {
    application = await self.runApplication(applicationId);
  } catch(err) {
    Logger.error(`Unsuccessful attempt to run application '${applicationId}': ${err}`)
  }

  try {
    //application;
  } catch(err) {
    Logger.error(`Unsuccessful attempt to run application '${applicationId}': ${err}`)
  }

  callback({ error: false });
});

function windowTemplate() {
  const fileName = pathJoin(__dirname, '../client/window.html')
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