import moment  from "moment";
import CodeGenerator from 'node-code-generator';

import Logger from './Logger';

declare type AccessCode = {
  code: string,
  email: string,
  expire: moment.Moment
}

declare enum CodeStatus {
  OK = 'ok',
  NOT_FOUND = 'not found',
  EXPIRED = 'expired'
}

const accessCodes: Map<string, AccessCode> = new Map();

export default class Verification {

  static startService(): void {
    setInterval(checkCodes, 1000*2);

    function checkCodes() {
      accessCodes.forEach((value, key) => {
        if(value.expire < moment()) {
          Logger.debug(`Access code ${key} is expired and deleted`);
          accessCodes.delete(key);
        }
      });
    }
  }

  static generateCode(email: string): string {
    const generator = new CodeGenerator();
    const code = generator.generateCodes('######', 1, {})[0];
    accessCodes.set(code, {
      code,
      email, 
      expire: moment().add(5, 'minutes')
    });
    return code;
  }

  static verify(code: string, email: string): CodeStatus {

    let status: CodeStatus;
    const entry = accessCodes.get(code);
    if(!entry) {
      status = CodeStatus.NOT_FOUND;
    } else {
      if(entry.expire > moment()) {
        status = CodeStatus.OK;
      } else {
        status = CodeStatus.EXPIRED;
      }
    }
    
    return status;
  }
}
