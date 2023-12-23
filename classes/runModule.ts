import os from 'node:os';
import vm from 'node:vm';
import { dirname, join } from 'node:path';
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
  
  const wrapped = [
    wrapper[0], 
    code,
    wrapper[1],
  ];
  
  const codeToRun = wrapped.join('');

  let script = new vm.Script(codeToRun, {
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
  
  /**
   * Only adding that procedure rigth after a module was loaded makes 
   * the @buildin @id:ms-vscode.js-debug extention refresh source maps and 
   * set breakpoints in the right places after code was changed during
   * an app is running. It still works not perfect, and 
   * sometimes breackpoint indicators could be placed in the wrong places.
   * I tried to use `node:fs` `writeFileSync` instead of `outputFileSync`, 
   * but it didn't help at all. I have no idea why.
   * During investigating this ussue I tried to debug the `vscode-js-debug`
   * extention https://github.com/microsoft/vscode-js-debug.
   * Finally I gave up in places:
   * 1: `src/common/sourceMaps/sourceMap.ts`: `originalPositionFor` method
   * 2: `src/adapter/sourceContainer.ts`: `getOptiminalOriginalPosition` method
   * 3: `src/adapter/sourceContainer.ts`: `getCompiledLocations` method
   * All that methods were used on `setBreakpoints` event of DAP instance 
   * of Binder class inside `src/binder.ts`
   */
  if(DEV_MODE) {
    outputFileSync(join(HOME_DIR, '.cubismo', 'debugger-patch'), String(Number(new Date()))); 
    // outputFileSync(join(HOME_DIR, '.cubismo', filename.replace('.ts', '.js')), codeToRun); 
  }
  
  return _module.exports;
}
