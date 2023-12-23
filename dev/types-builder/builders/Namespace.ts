import Interface from "./Interface";
import Module from "./Module";
import Symbols from './Symbols';
import { Types } from '../Types';
import { Parameter } from '../Parameter';
import { existsSync } from "fs";
import getIndent from './getIndent';

export default class Namespace {

  public name: string;
  public interfaces: Interface[] = [];
  public modules: Module[] = [];

  constructor(name: string) {
    
    this.name = name;
    this.interfaces = [];
    this.modules = [];
  }

  print(level: number = 1) {

    const indent = getIndent(level);

    const body: string[] = [];

    body.push(`${indent}declare namespace ${this.name} {${Symbols.NEW_LINE}`);
    
    for(let _interface of this.interfaces) {
      body.push(_interface.print(level + 1));
    }

    for(let _module of this.modules) {
      body.push(_module.print(level + 1));
    }

    body.push(`${indent}}\n`);

    return body.join('\n');
  }
}