/* global Tools */
"use strict";
const fs     = require("fs");
const path   = require("path");

const Require = require("../Require.js");

function View(_arguments) {
    
    const _private = {};
    _private.showCallback   = _arguments.showCallback;
    _private.closeCallback  = _arguments.closeCallback;
    
    Object.defineProperty(this, "id", { value: Tools.SID(), enumerable: false, writable: false });
    Object.defineProperty(this, "name", { value: _arguments.name, enumerable: false, writable: false });
    
    this.params = _arguments.params;
    if(_arguments.instance) {
        this.instance = _arguments.instance;
        this.instance.view = this;
    }
    
    const pathToFile = path.join(
        _arguments.cube.dirname, _arguments.class, 
        [_arguments.class, _arguments.modelName, "Views", _arguments.name, "js"].join(".")
    );
    Require(pathToFile, { Application: _arguments.application, View: this });
}
module.exports = View;