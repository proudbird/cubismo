import os from 'os'
import path         from 'path'
import EventEmitter from 'events'
import http         from 'http'
import express      from 'express'


export default class Router extends EventEmitter {

  public server: http.Server

  async run (port: number): Promise<void> {

    const self = this
    const router = express();
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

    return new Promise((resolve, reject) => {
      this.server = router.listen(port, function() {  
        Logger.info(`cubismo server is listening at port ${port}`)
        resolve()
      })
    })
  }
}