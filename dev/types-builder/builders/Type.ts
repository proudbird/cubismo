import Property from "./Property";
import Method from "./Method";
import Symbols from './Symbols';
import { Types } from '../Types';
import { Parameter } from '../Parameter';
import { existsSync } from "fs";
import getIndent from './getIndent';

export default class Type {

  public name: string;
  public body: string;

  constructor(name: string, body: string) {
    
    this.name = name;
    this.body = body;
  }

  print(level: number = 1) {

    const indent = getIndent(level);

    let declaration = '';
    if(level === 1) {
      declaration = `declare `;
    }
    
    const bodyString = this.body.replace(/"/g,'').replace(/\r\n/g,`${Symbols.NEW_LINE}${indent}`);

    return `${indent}${declaration}type ${this.name} = ${bodyString}${Symbols.NEW_LINE}`;
  }
}