import winax from 'winax';
import { Converter } from "converter-1c-internal";
import Cubismo from '../../cubismo'

delete global.ActiveXObject // we don't want someone else could create ActiveX objects - unsafe

declare type ConnectionConfig = {
  ProgID: 'V81.COMConnector' | 'V82.COMConnector' | 'V83.COMConnector' 
        | 'V81.Application'  | 'V82.Application'  | 'V83.Application' 
        | 'V77.Application'  | 'V77S.Application' | 'V77L.Application'
        | 'V77M.Application' | 'V1CEnterprise.Application',
  File?: string,
  Srvr?: string,
  Ref?: string,
  Usr: string,
  Pwd: string
}

export default class OneC {

  constructor(cubismo: Cubismo) {
    //super('OneC', cubismo)
  }

  async connect(conf: ConnectionConfig): Promise<Connection> {

    return new Promise((resolve, reject) => {
      
      let connection: Connection
      let activeX: winax.Object

      try {
        activeX = new winax.Object(conf.ProgID)
      } catch(error) {
        if(error.message.includes('Недопустимая строка с указанием класса')) {
          error = new Error(`${error}It looks like ProgID of COM-class is incorrect, or COM-class is not registered `)
        }
        return reject(error)
      }

      if(conf.ProgID.includes('V8')) {
        
        let conStr: string
        if(conf.File) {
          conStr = `File="${conf.File}";Usr=${conf.Usr};Pwd=${conf.Pwd}`
        } else if(conf.Srvr) {
          conStr = `Srvr="${conf.Srvr}";Ref="${conf.Ref}";Usr=${conf.Usr};Pwd=${conf.Pwd}`
        } else {
          return reject(new Error(`Connection string doesn't has neither 'File' Nnr 'Srvr' parametrs`))
        }

        try {
          connection = activeX.Connect(conStr)
        } catch(error) {
          if(error.message.includes('Connect Ошибка')) {
            error = new Error(`${error}Check wether path to the base, user name, or password are correct`)
          }
          return reject(error)
        }

        if(!connection) {
          return reject(new Error(`Attempt to connect to 1C with '${conf.ProgID}' faild`))
          // TODO: to add possible reasons
        }
  
        let result
        if(conf.ProgID.includes('Application')) {
          result = activeX
        } else {
          result = connection
        }

        resolve(result)
      } else {

      }
    })
  }

  convertFromInternal = Converter.convertFrom1C;
  convertToInternal = Converter.convertTo1C;
}


class Connection {


}