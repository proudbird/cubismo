import Property from "./Property";
import Method from "./Method";
import Symbols from './Symbols';
import { Types } from '../Types';
import { Parameter } from '../Parameter';
import { existsSync } from "fs";
import getIndent from './getIndent';
import ObjectVariable from "./ObjectVariable";

export default class Interface extends ObjectVariable {

  public name: string;
  public extends: null | string;
  public properties: Property[] = [];
  public methods: Method[] = [];

  addMethod(
      name: string, 
      params: Parameter[], 
      returns: Types[]|string[], 
      description: string | string[] = '',
      isStatic: boolean = false
    ) {
      const method = new Method(name, params, returns, description, isStatic);
      this.methods.push(method);
  }

  print(level: number = 1) {

    const indent = getIndent(level);

    const body: string[] = [];

    let declaration = '';
    if(level === 0) {
      declaration = `declare `;
    }

    let target = 'class';
    if(this.constructor.name === 'Interface') {
      target = 'interface';
    }

    let extendsSign = '';
    if(this.extends) {
      extendsSign = ` extends ${this.extends}`;
    }

    body.push(`${indent}${declaration}${target} ${this.name}${extendsSign} {${Symbols.NEW_LINE}`);
    
    for(let property of this.properties) {
      body.push(property.print(level + 1));
    }

    for(let method of this.methods) {
      body.push(method.print(level + 1));
    }

    body.push(`${indent}}${Symbols.NEW_LINE}`);

    return body.join(Symbols.NEW_LINE);
  }
}