import fs   from 'fs'
import path from 'path'
import http from 'http'
import { Server as SocketIO, Socket } from 'socket.io'

import { ApplicationProperties} from './Cubismo'

export default class Communicator extends SocketIO {
  constructor(httpServer: http.Server, applications: Map<string, ApplicationProperties>) {
    super(httpServer)

    this.on('connection', async function(socket: Socket) {
      Logger.debug(`Client with id ${socket.id} is connected`)

      setEnvVariables(socket.handshake.query)

      if(!applications.has(process.env.APP)) {
        return Logger.error(`Can't find application '${process.env.APP}'`)
      }
      const applicationProperties = applications.get(process.env.APP)
      applicationProperties.courier = socket

      try {
        const config = await getAppWindowConfig(applicationProperties.dirname)
        socket.emit('window', config)
      } catch(err) {
        Logger.error(`Unsuccessful attempt to load window config for the application '${process.env.APP}': ${err}`)
      }

      socket.on('componentEvent', async function(message, callback) {
        Logger.info(message.id)
        callback(`it is done`)
      })
    })
  }
}

function setEnvVariables(params) {
  process.env.APP    = params.applicationId;
  process.env.WINDOW = params.windowId;
  process.env.TOKEN  = params.token;
  process.env.LANG   = params.lang;
}

async function getAppWindowConfig(dirname: string) {

  const configFileName = path.join(dirname, 'Window.json')

  return new Promise((resolve, reject) => {
    if(!fs.existsSync(configFileName)) {
      reject(new Error(`Can't find window config file in the apllication folder`))
    }
  
    fs.readFile(configFileName, 'utf-8', (err, configFile) => {
      if(err) {
        reject(err)
      }
      resolve(configFile)
    })
  })
}