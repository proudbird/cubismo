/* globals TempStorage Tools Log*/
const fs   = require("fs");
const path = require("path");
const nodeModule = require("module");

function Base(application, cube, name, dirname, filename) {

    const _private = {};

    _private.application = application;
    _private.cube        = cube;
    _private.name        = name;
    _private.dirname     = dirname;
    _private.filename    = filename;
    
    for(let property in _private) {
        Object.defineProperty(this, property, { enumerable: false,
            set() {
                const err = new Error("It is not allowed to change propery '" + property + "' of " + name + " manually.");
                Log.error(err.message, err);
            },
            get() { return _private[property] }
        });
    }
    
    _private.modules     = {};
    
    if(!filename) { return };
    const moduleFileName = path.join(dirname, filename);
    if(!fs.existsSync(moduleFileName)) { return }
    const id = require.resolve(moduleFileName);
    let load = true;
    let storedModule = _private.modules[id];
    if (storedModule) {
        let lastUpdated = fs.statSync(moduleFileName).mtime;
        Log.info(lastUpdated)
        Log.info(typeof lastUpdated)
        if (lastUpdated === storedModule.lastUpdated) {
            load = false;
        }
    }

    if (load) {
        const moduleId = TempStorage.putValue(this);
        const appId = TempStorage.putValue(this.application);
        const subWraper = [
            '"use strict";',
            'const Application = TempStorage.getValue("' + appId + '");',
            'const Module = TempStorage.getValue("' + moduleId + '");'
        ];
        _require(moduleFileName, subWraper);
        storedModule = { module: this, lastUpdated: fs.statSync(moduleFileName).mtime }
        _private.modules[id] = storedModule;
    }
}
module.exports = Base;

function _require(pathToModule, subWraper, clearCache) {

    if (fs.existsSync(pathToModule)) {
        delete require.cache[require.resolve(pathToModule)];
        try {
            // override original Node 'require' function to supply our module with additional 
            // global variables
            (function(originalModuleWrap) {
                nodeModule.wrap = function(script) {
                    const wrapper = [
                        '(function (exports, require, module, __filename, __dirname) { ',
                        '\n});'
                    ];
                    return wrapper[0] + subWraper.join(' ') + script + wrapper[1];
                };
            }(nodeModule.wrap));

            // loading our module
            var _module = require(pathToModule);

            // returning 'require' unction to the original state
            (function(originalModuleWrap) {
                nodeModule.wrap = function(script) {
                    const wrapper = [
                        '(function (exports, require, module, __filename, __dirname) { ',
                        '\n});'
                    ];
                    return wrapper[0] + script + wrapper[1];
                };
            }(nodeModule.wrap));

            return _module;
        }
        catch (err) {
            Log.error("Error on loadin module '" + pathToModule, err);
        }
    }
    else {
        Log.warn("Cannot find module '" + pathToModule + "'");
    }
}