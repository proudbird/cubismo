import Symbols from './Symbols';
import Interface from "./Interface";
import Type from "./Type";
import getIndent from './getIndent';

export default class Module {

  public name: string;
  public modules: Module[] = [];
  public interfaces: Interface[] = [];
  public types: Type[] = [];

  constructor(name: string) {
    this.name = name;
    this.modules = [];
    this.interfaces = [];
    this.types = [];
  }

  print(level: number = 1) {

    const indent = getIndent(level);

    let declaration = '';
    if(level === 0) {
      declaration = `declare `;
    }

    const body: string[] = [];

    body.push(`${indent}${declaration}module ${this.name} {${Symbols.NEW_LINE}`);
    
    for(let _module of this.modules) {
      body.push(_module.print(level + 1));
    }

    for(let _interface of this.interfaces) {
      body.push(_interface.print(level + 1));
    }

    for(let type of this.types) {
      body.push(type.print(level + 1));
    }

    body.push(`${indent}}\n`);

    return body.join('\n');
  }
}