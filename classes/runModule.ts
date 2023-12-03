import { dirname, join } from 'node:path';
import os from 'node:os';

import vm from 'node:vm';
import transformCode from './transformeCode';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { outputFileSync } from 'fs-extra';

const HOME_DIR = os.homedir();

let LINK_COUNT = 0;

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

  const level = filename.replace(options.rootDir, '').split('/').length - 1;
  let outDir = '..';
  for(let i = 0; i < level-1; i++) {
    outDir = outDir + '/..';
  }
  // let { code, map } = transformCode(outDir + filename.replace(options.rootDir, ''), source);
  let { code, map } = transformCode(filename, source);


  //const adopted = map.replace('"version":3,', `"version":3,"file":"${filename.split('/').pop().replace('ts', 'js')}",`);
  // TODO: find better way to store source maps

  const sourceMapsRoot = options.rootDir + '/.dist';
  const outputFile = filename.replace(options.rootDir, sourceMapsRoot);
  const sourceMapFile = outputFile.replace('.ts', '.js.map');

  // rmSync(sourceMapFile, { force: true });

  //outputFileSync(sourceMapFile, adopted);

  const codeParts = code.split('//# sourceMappingURL');
  
  const newModule = [
    wrapper[0], 
    // code.replace('"use strict";', ''),
    codeParts[0].replace('"use strict";', ''),
    wrapper[1],
    // `\n//# sourceMappingURL=${sourceMapFile.split('/').pop()}?t=${Number(new Date())}`,
    `\n\n//# sourceMappingURL${codeParts[1]}`,

  ].join('');
  
  const scriptFileName = outputFile.replace('.ts', '.js');

  // rmSync(scriptFileName, { force: true });

  // outputFileSync(scriptFileName.replace('Modules', 'Services'), 'newModule'); 
  // outputFileSync(join(options.rootDir, 'script-change-time.txt'), String(Number(new Date()))); 

  // writeFileSync(join(options.rootDir, 'script-change-time.txt'), String(Number(new Date())), 'utf8');


  let script = new vm.Script(newModule, 
    {
      // filename: scriptFileName,
      filename: filename,
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

  Object.defineProperty(adoptedArgs, 'link', {
    get: function() {
      return LINK_COUNT;
    }
  });

  compiledModule.call(context, adoptedArgs);
  
  outputFileSync(join(HOME_DIR, '.cubismo', 'debugger-patch'), String(Number(new Date()))); 
  
  return _module.exports;
}
