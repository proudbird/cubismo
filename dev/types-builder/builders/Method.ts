import { Types, print as printTypes } from '../Types';
import { Parameter } from '../Parameter';
import Symbols from './Symbols';
import getIndent from './getIndent';


export default class Method {

  public name: string;
  public params: Parameter[]
  public returns: Types[]|string[];
  public description: string | string[];
  public static?: boolean 

  constructor(name: string, params: Parameter[], returns: Types[]|string[], description: string | string[] = '', isStatic: boolean = false) {
    
    this.name = name;
    this.params = params;
    this.returns = returns;
    this.description = description;
    this.static = isStatic;
  }

  print(level: number = 1) {

    const indent = getIndent(level);

    let staticClause = '';
    if(this.static) {
      staticClause = 'static ';
    }

    let params: any[] = [];
    for(let param of this.params) {
      let optionalClause = '';
      if(param.value) {
        optionalClause = '?';
      }
      params.push(`${param.name}${optionalClause}${printTypes(param.types)}`);
    }

    if(Array.isArray(this.description)) {
      this.description = this.description.join(Symbols.NEW_LINE);
    }
    this.description = this.description.replace(/\r\n/g,`${Symbols.NEW_LINE}${indent}`)
    let code = this.description ? `${indent}/*${this.description}*/${Symbols.NEW_LINE}` : '';
    code += `${indent}${staticClause}${this.name}(${params.join(', ')})${printReturns(this.returns)};${Symbols.NEW_LINE}`;
    return code;
  }
}

function printReturns(returns: string[]|Types[]) {
  const result: string[] = [];
  for(let r of returns) {
    if(!r) continue;
    result.push(r);
  }
  return result.length ? `: ${result.join(' | ')}` : '';
}