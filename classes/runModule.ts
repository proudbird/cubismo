import { dirname, join } from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { outputFileSync } from 'fs-extra';

import transformCode from './transformeCode';

const HOME_DIR = os.homedir();

const DEV_MODE = process.env.NODE_ENV === 'development';

export interface RunModuleOptions {
  clearCache?: boolean;
  hideGlobals?: string[];
  rootDir?: string;
}

export default function runModule(
  filename: string, 
  context: any, 
  args: Record<string, any>, 
  options: RunModuleOptions
) {

  args  = args  || {};
  options = options || {};

  const nativeArgs = ['require', '__filename', '__dirname'];

  let hide = options.hideGlobals || [];
  if(typeof hide === 'object') {
    if(hide[0] === 'all' || hide.length === 0) {
      hide = nativeArgs;
    }
  };

  const argNames  = [];
  let argValues = [];

  for (let key in args) {
    argNames .push(key);
    argValues.push(args[key]);
  }

  const wrapperStart = [
    '(function ({ link, exports, module'
  ];

  nativeArgs.forEach(nativeArg => {
    if (!hide.includes(nativeArg)) {
      wrapperStart.push(nativeArg);
      switch (nativeArg) {
        case 'require':
          [require].concat(argValues);  
        case '__filename':
          [filename].concat(argValues);
        case '__dirname':
          [dirname(filename)].concat(argValues);
      }
    }
  });

  wrapperStart.push(argNames.join(', '));

  const wrapper = [
    [wrapperStart.join(', '), ' }) { '].join(''), 
    '\n});'
  ];

  let source = '';
  try {
    source = readFileSync(filename, 'utf8');
  } catch (error) {
    throw new Error(`Can't load module ${filename}: ${error.message}`);
  }

  let { code } = transformCode(filename, source, DEV_MODE);

  const codeParts = code.split('//# sourceMappingURL');
  
  const newModule = [
    wrapper[0], 
    codeParts[0],
    wrapper[1],
    `\n\n//# sourceMappingURL${codeParts[1]}`,
  ].join('');
  
  let script = new vm.Script(newModule, {
    filename,
    lineOffset: 0,  // we need such values of that options 
    columnOffset: 1,// to make vs code debug our file properly
  });

  let compiledModule;
  try {
    compiledModule = script.runInThisContext({
      displayErrors: true,
    });
  } catch (error) {
    return;
  }

  const _module = { exports: {} };
  argValues = [_module.exports, _module].concat(argValues);

  const adoptedArgs = args;
  adoptedArgs['exports'] = _module.exports;
  adoptedArgs['module'] = _module;

  compiledModule.call(context, adoptedArgs);
  
  if(DEV_MODE) {
    outputFileSync(join(HOME_DIR, '.cubismo', 'debugger-patch'), String(Number(new Date()))); 
  }
  
  return _module.exports;
}
