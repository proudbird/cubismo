/* global Tools */
"use strict";
const fs     = require("fs");
const path   = require("path");

const Require    = require("../Require.js");
const ConfigView = require("./ConfigView.js");

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

    this.__proto__.show = function() {
        show(this, _arguments, _private);
    }
}
module.exports = View;

function show(view, _arguments, _private) {

    const file = [];
    if(_arguments.class) {
        file.push(_arguments.class);
    }
    if(_arguments.modelName) {
        file.push(_arguments.modelName);
        file.push("Views");
    }
    file.push(_arguments.name);
    file.push("js");

    let pathToFile = path.join(
        _arguments.application.dirname, _arguments.cube ? _arguments.cube.name : "", _arguments.class || "", 
        file.join(".")
    );

    if(_arguments.name === "List" && !fs.existsSync(pathToFile)) {
        pathToFile = path.join(__dirname, "./DefaultViews/" + _arguments.class + ".Views.List.js");
    }

    Require(pathToFile, { Application: _arguments.application, View: view });

    ConfigView(view, _arguments, pathToFile.replace(".js",  ".Config.js"));
}