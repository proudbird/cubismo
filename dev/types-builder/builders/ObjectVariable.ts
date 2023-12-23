import Property from "./Property";
import Symbols from './Symbols';
import { Types } from '../Types';

import getIndent from './getIndent';

export default class ObjectVariable {

  public name: string;
  public extends: null | string;
  public properties: Property[] = [];

  constructor(name: string, _extends?: string) {
    
    this.name = name;
    this.extends = _extends || null;
  }

  addProperty(name: string, types: Types|string[], description?: string | string[], isStatic?: boolean) {
    const property = new Property(name, types, description, isStatic, true);
    this.properties.push(property);
  }

  print(level: number = 1) {

    const indent = getIndent(level);

    const body: string[] = [];

    let declaration = '';
    if(level === 0) {
      declaration = `declare `;
    }

    let target = 'var';

    body.push(`${indent}${declaration}${target} ${this.name}: {${Symbols.NEW_LINE}`);
    
    for(let property of this.properties) {
      body.push(property.print(level + 1));
    }

    body.push(`${indent}}${Symbols.NEW_LINE}`);

    return body.join(Symbols.NEW_LINE);
  }
}