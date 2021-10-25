import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs'
import path    from 'path'
import http    from 'http'
import Cubismo from './cubismo/Cubismo'
import './common/Utils'
import dotenv from "dotenv";

dotenv.config();

let cubismo: Cubismo
let sekretKey: string
let applicationId: string
let port: number = 21021
let host: string = '127.0.0.1';
let stopPort: number
let message: string

const args = process.argv;
for(let i=0; i<args.length; i++) {
  switch (args[i]) {
    case "--key":
      sekretKey = i < args.length-1 ? args[i+1] : undefined
      break;
    case "--app":
      applicationId = i < args.length-1 ? args[i+1] : undefined
      break;
    case "--port":
      port = Number(i < args.length-1 ? args[i+1] : port)
        break;
    case "--stop":
      stopPort = Number(i < args.length-1 ? args[i+1]: 21021)
  }
}

sekretKey = sekretKey || initKey()

async function runServer() {

  process.env.NODE_ENV = process.env.NODE_ENV || "production";

  cubismo = new Cubismo(__dirname, sekretKey);
  await cubismo.start(applicationId)
  message = `port ${port}`
}

async function stopServer(stopPort, restart?: boolean) {

  restart = restart || false

  if(!restart) {
  // check if there is already running instance of cubismo server
    if(await checkInstance(stopPort)) {
    
      const result = await stopInstance(stopPort, sekretKey) 
      if(result.error) {
        Logger.info(`Error on stooping cubismo server: ${result.errorMessage}`)
      }
      message = `cubismo server is stopped`
      Logger.info(message)
      process.exit()
    }
  } else {
    // destroing cubismo instance
    cubismo.destroy()
    cubismo = null
    // clearing modules cache
    Object.keys(require.cache).forEach(function(key) { delete require.cache[key] })

    Logger.info(`cubismo server is stopped`)
    Logger.info(`cubismo server is starting`)
    // running cubismo again
    runServer()
  }
}

if(stopPort) {
  stopServer(stopPort)
} else {
  runServer()
}

// running functions
async function checkInstance(port: number): Promise<boolean>  {

  return new Promise<boolean>((resolve, reject) => {
    
    var options = {
      host: '127.0.0.1',
      path: '/ping',
      port: port,
    }

    http.request(options, async (httpResponse) => {
    
      let response = ''

      httpResponse.on('data', async function (chunk) {
        response += chunk
      })

      httpResponse.on('end', async function () {
        resolve(true)
      })

      httpResponse.on('error', async function () {
        resolve(false)
      })

      httpResponse.on('timeout', async function () {
        resolve(false)
      })
    }).end()
  })
}

async function stopInstance(port: number, sekretKey: string): Promise<any> {

  return new Promise<any>((resolve, reject) => {
    
    var options = {
      host: '127.0.0.1',
      path: '/stop?key=' + sekretKey,
      port: port,
      method: 'POST'
    }

    http.request(options, async (httpResponse) => {
    
      let response = ''

      httpResponse.on('data', async function (chunk) {
        response += chunk
      })

      httpResponse.on('end', async function () {
        const result = JSON.parse(response)
        resolve(result)
      })

      httpResponse.on('error', async function (err) {
        resolve({ error: true, errorMessage: err})
      })
      }).end()
  })
}

export function initKey(): string {

  let key: string

  const appDataFolder = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share")
  const cubismoFolder = path.join(appDataFolder, 'cubismo')
  const appListFile = path.join(cubismoFolder, 'key')
  if(!existsSync(cubismoFolder)) {
    mkdirSync(cubismoFolder)
  }
  if(!existsSync(appListFile)) {
    key = Utils.guid()
    writeFileSync(appListFile, key)
  } else {
    key = readFileSync(appListFile, 'utf-8')
  }

  return key
}