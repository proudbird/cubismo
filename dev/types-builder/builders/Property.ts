import { Types } from '../Types';
import Symbols from './Symbols';
import getIndent from './getIndent';

export default class Property {

  public name: string;
  public type: Types | string | Types|string[];
  public description: string | string[];
  public static?: boolean 
  public optional?: boolean 

  constructor(
    name: string, 
    type: Types | string | Types[]|string[], 
    description: string | string[] = '',
    isStatic = false,
    isOptional = false
    ) {
    
    this.name = name;
    this.type = type;
    this.description = description;
    this.static = isStatic;
    this.optional = isOptional;
  }

  print(level: number = 1) {

    const indent = getIndent(level);

    let staticClause = '';
    if(this.static) {
      staticClause = 'static ';
    }

    let type = '';

    if(Array.isArray(this.type)) {
      const types: string[] = [];
      for(let t of this.type) {
        types.push(t);
      }
      type = types.join(' | ');
    } else {
      type = this.type;
    }

    let description: string;
    if(Array.isArray(this.description)) {
      const descriptions: string[] = [];
      for(let d of this.description) {
        descriptions.push(d);
      }
      description = indent + descriptions.join(`${Symbols.NEW_LINE}${indent}`);
    } else {
      description = `${indent}${this.description}`;
    }

    let code = this.description ? `${description}${Symbols.NEW_LINE}` : '';
    code += `${indent}${staticClause}${this.name}${this.optional && '?'}${type ? ': ' + type : ''};${Symbols.NEW_LINE}`;
    return code;
  }
}