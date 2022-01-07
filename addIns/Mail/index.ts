import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { join as pathJoin } from "path";
import nodemailer from "nodemailer";
import Cubismo from "../../core/Cubismo";
import Application from "../../classes/application/Application";

export default class Mail {

  #cubismo: Cubismo;
  #application: Application;

  constructor(cubismo: Cubismo) {
    this.#cubismo = cubismo;
  }

  postman(options: MailTransporterOptions) {
    return  new Postman(options);
  }
}

class Postman {

  #transporter: any;

  constructor(options: MailTransporterOptions) {
    this.#transporter = nodemailer.createTransport(options);
  }

  async send(mail: MailData): Promise<SentMailInfo> {
    
    try {
      return await this.#transporter.sendMail(mail);
    } catch(error) {
      throw new Error(`Can't send mail: ${error}`);
    }
  }
}

declare type MailTransporterOptions = {
  pool?: boolean,
  host: string,
  port: number,
  secure: boolean,
  auth: {
    user: string,
    pass: string,
  },
  tls?: {
    rejectUnauthorized?: boolean,
  }
}

declare type SentMailInfo = {
  envelope: string,
  messageId: string
}

declare type MailData = {
  from: string,
  to: string,
  subject?: string,
  text?: string,
  html?: string
}