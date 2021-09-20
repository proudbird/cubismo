import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs'
import path    from 'path'
import http    from 'http'
import SysTray from 'systray'
import notifier from 'node-notifier'
import Cubismo from './cubismo/Cubismo'
import './common/Utils'


import puppeteer from 'puppeteer'
import { xor } from 'lodash'

let cubismo: Cubismo
let sekretKey: string
let applicationId: string
let port: number = 21021
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

  cubismo = new Cubismo(port, __dirname, sekretKey)
  await cubismo.start(applicationId)
  message = `port ${port}`
  // notifier.notify({
  //   title: 'Server is started',
  //   message: message,
  //   icon: path.join(__dirname, 'favicon.png'),
  //   sound: true,
  //   wait: false,
  //   appName: 'cubismo'
  // })
}

async function stopServer(stopPort, restart?: boolean) {

  restart = restart || false

  if(!restart) {
  // check if there is already running instance of cubismo server
    if(await checkInstance(stopPort)) {

      function exit() {
        //systray.kill()
        process.exit()
      }
    
      const result = await stopInstance(stopPort, sekretKey) 
      if(result.error) {
        Logger.info(`Error on stooping cubismo server: ${result.errorMessage}`)
      }
      message = `cubismo server is stopped`
      Logger.info(message)
      notifier.notify({
        title: 'Server is stopped',
        message: '...',
        icon: path.join(__dirname, 'favicon.png'),
        sound: true,
        appName: 'cubismo'
      },
      function() {
        // to show notification
        setTimeout(exit, 500)
      })
      
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

// SYSTRAY
// const systray = new SysTray({
//   menu: {
//     // you should using .png icon in macOS/Linux, but .ico format in windows
//     icon: readFileSync('favicon.ico','base64'),
//     title: "cubismo",
//     tooltip: "cubismo server",
//     items: [
//       {
//         title: `Running on port ${port}`,
//         tooltip: undefined,
//         checked: false,
//         enabled: true
//       },
//       {
//         title: "Restart server",
//         tooltip: "Restart server",
//         // checked is implement by plain text in linux
//         checked: false,
//         enabled: true
//       },
//       {
//         title: "Stop server",
//         tooltip: "Stop server",
//         // checked is implement by plain text in linux
//         checked: false,
//         enabled: true
//       }
//     ]
//   },
//   debug: false,
//   copyDir: true, // copy go tray binary to outside directory, useful for packing tool like pkg.
// })

// systray.onClick(action => {
//   if(action.seq_id === 1) {
//     stopServer(port, true)
//   } else if(action.seq_id === 2) {
//     stopServer(port)
//   }
// })

// setTimeout(toPdf, 20);

// async function toPdf() {

//   const browser = await puppeteer.launch();
//   const page = await browser.newPage();
//   await page.goto("http://localhost:21021/app/optima");
//   console.log('111')
//   const elements = await page.$$('[label]');
//   console.log('222')
//   if(elements.length) {
//     console.log('333')
//     let count = 1;
//     let x = 0, y = 0;
//     let width = 219.2;
//     let height = 152.17;
//     for(let count = 0; count<elements.length; count++) {
//       console.log('444')
//       const el = elements[count];
//       console.log('555')
//       // try{
//       //   await page.screenshot({ path: path.join(__dirname, `img${count}.png`),
//       //     clip: {
//       //       x,
//       //       y,
//       //       width,
//       //       height
//       //     }
//       //   });
//       //   y+=height;
//       // } catch(error) {
//       //   console.log(`can't make screenshot ${error.message}`);
//       // }  
      
//       try{
//         await el.screenshot({ path: path.join(__dirname, `img${count}.png`) });
//         y+=height;
//       } catch(error) {
//         console.log(`can't make screenshot ${error.message}`);
//       }  

//     }
//   }

//   // await page.pdf({
//   //   path: path.join(__dirname, 'test2.pdf'), 
//   //   //scale: 1.465,
//   //   width: '58.2mm',
//   //   height: '40.1mm',
//   //   margin: {
//   //     top: 0, right: 0, bottom: 0, left: 0
//   //   }
//   // });

//   await browser.close();  
// }