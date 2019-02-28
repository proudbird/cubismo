/* global Tools */
"use strict";
const fs     = require("fs");
const path   = require("path");

const EventEmitter = require('events');

const Require    = require("../Require.js");
const ConfigView = Require(path.join(__dirname, "./ConfigView.js"), undefined, true);

function View(_arguments) {
    
    const _ = {};
    _.showCallback   = _arguments.showCallback;
    _.closeCallback  = _arguments.closeCallback;

    class Generator extends EventEmitter {}
    const generator = new Generator();
    this.closeCallback = generator;
    
    Object.defineProperty(this, "id", { value: Tools.SID(), enumerable: false, writable: false });
    Object.defineProperty(this, "name", { value: _arguments.name, enumerable: false, writable: false });
    
    this.params = _arguments.params;
    this.options = _arguments.options;
    if(!this.options) {
        this.options = {};
    }
    if(_arguments.item) {
        this.item = _arguments.item;
        this.item.view = this;
    }
    if(this.options.owner) {
        this.owner = _arguments.options.owner;
        this.owner.view = this;
    }
    if(this.options.parent) {
        this.parent = _arguments.options.owner;
        this.parent.view = this;
    }

    _arguments.application.views[this.id] = this;

    this.__proto__.show = function() {
        const self = this;
        const mainFunction = function(callback) {
            show(self, _arguments, _)
            .then((viewConfig) => {
                const result = {
                    config: viewConfig,
                    promise: new Promise(function (resolve, reject) {
                        self.closeCallback.on("close", function (value) {
                            resolve(value);
                        })
                    })
                }

                return callback(null, result);
            })
            .catch((err) => {
                return callback(err);
            })
        }
        
        if(_arguments && _arguments.showCallback) {
            return mainFunction(_arguments.showCallback);
        }
        return new Promise(function(resolve, reject) {
            mainFunction(function(error, result) {
                error ? reject(error) : resolve(result);
            });
        });   
    }

    this.__proto__.close = function(value) {
        const self = this;
        const mainFunction = function(callback) {
            close(self, _arguments, _, value)
            .then((viewConfig) => {
                //return callback(null, value);
                self.closeCallback.emit("close", value);
            })
            .catch((err) => {
                return callback(err);
            })
        }
        
        if(_arguments && _arguments.closeCallback) {
            return mainFunction(_arguments.closeCallback);
        }
        return new Promise(function(resolve, reject) {
            mainFunction(function(error, result) {
                error ? reject(error) : resolve(result);
            });
        });  
    }
}
module.exports = View;

function show(view, _arguments, _) {
    const self = this;

    const mainFunction = function(callback) {
        const file = [];
        if(_arguments && _arguments.class) {
            file.push(_arguments.class);
        }
        if(_arguments && _arguments.modelName) {
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
            //_arguments.model = _arguments.application[_arguments.cube.name][_arguments.class][_arguments.modelName];
        }

        if(_arguments.name === "Item" && !fs.existsSync(pathToFile)) {
            pathToFile = path.join(__dirname, "./DefaultViews/" + _arguments.class + ".Views.Item.js");
            //_arguments.model = _arguments.application[_arguments.cube.name][_arguments.class][_arguments.modelName];
        }

        if(_arguments.name === "Folder" && !fs.existsSync(pathToFile)) {
            pathToFile = path.join(__dirname, "./DefaultViews/" + _arguments.class + ".Views.Folder.js");
            //_arguments.model = _arguments.application[_arguments.cube.name][_arguments.class][_arguments.modelName];
        }

        Require(pathToFile, { Application: _arguments.application, View: view, Item: view.item, Owner: view.Owner, Parent: view.Parent }, true);

        let pathToConfig = pathToFile.replace(".js",  ".Config.json");
        if(!fs.existsSync(pathToConfig)) {
            pathToConfig = pathToConfig.replace(".Config.json",  ".Config.js");
        }

        if(view.onInit) {
            view.onInit(function() {
                ConfigView(view, _arguments, pathToConfig);
                return callback(null, view.config);
            });
        } else {
            ConfigView(view, _arguments, pathToConfig);
            return callback(null, view.config);
        }
    }

    if (_.showCallback) {
        return mainFunction(_.showCallback);
    }
    return new Promise(function(resolve, reject) {
        mainFunction(function(error, result) {
            error ? reject(error) : resolve(result);
        });
    });
}

function close(view, _arguments, _, value) {
    const self = this;

    const mainFunction = function(callback) {
        _arguments.application.window.Viewbar.removeView(view.config.tabId)
        .then(result => {
            delete _arguments.application.views[view.id]
            callback(null);
        })
        .catch(err => {
            callback(err);
        })
    }

    if (_.showCallback) {
        return mainFunction(_.showCallback);
    }
    return new Promise(function(resolve, reject) {
        mainFunction(function(error, result) {
            error ? reject(error) : resolve(result);
        });
    });
}