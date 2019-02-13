/* global Tools */
"use strict";
const fs = require("fs");
const path = require("path");
const _ = require("lodash");

const Require = require("../Require.js");

const Item = require('./Item.js');

const View = require("../UI/View.js");

function Type(_arguments) {

    this._private = {};
    this._private.model = _arguments.model;

    //@TODO move it
    (function(original) {
        _arguments.model.build = function(values, options) {
            if (Array.isArray(values)) {
                return this.bulkBuild(values, options);
            }
            _arguments.instance = new this(values, options);
            const item = new Item(_arguments);
            return item;
        };
    }(_arguments.model.build));

    var Application = _arguments.application;

    Object.defineProperty(this, "name", {
        value: this._private.model.modelName,
        enumerable: false,
        writable: false
    });

    this.__proto__.new = function (predefinedValues) {
        return _new(Application, this._private.model, predefinedValues);
    }

    this.__proto__.show = function (_arguments) {
        if (!_arguments) {
            _arguments = {};
        }
        _arguments.type = this;
        _show(Application, this._private.model, _arguments);
    }

    // this.__proto__.select = function(options, callback) {
    //     var self = this;

    //     function mainFunction(options, callback) {
    //         _select(Application, self._private.model, options)
    //             .then(result => {
    //                 callback(null, result);
    //             })
    //             .catch(err => {
    //                 callback(err);
    //             })
    //     }

    //     if(callback) {
    //         return mainFunction(options, callback);
    //     }

    //     return new Promise(function (resolve, reject) {
    //         mainFunction(options, function (error, result) {
    //             error ? reject(error) : resolve(result);
    //         });
    //     });
    // }

    this.__proto__.select = async function(options, callback) {
        return await _select(Application, this._private.model, options);
    }
}

function _new(Application, model, predefinedValues) {

    var newInstance = predefinedValues;
    if (predefinedValues && predefinedValues.isNewRecord !== false) {
        newInstance = model.build(predefinedValues);
    } else {
        newInstance = model.build(predefinedValues);
    }

    if (model.associations instanceof Object) {
        var associations = model.associations;
        for (let key in associations) {
            if (associations[key].associationType === "HasMany") {
                newInstance[associations[key].as] = [];
            }
        }
    }

    if (predefinedValues) {
        for (let key in predefinedValues) {
            if (!newInstance[key] && model.associations[key]) {
                newInstance[key] = predefinedValues[key];
            }
        }
    }

    // const _arguments = {
    //     application: Application,
    //     model: model,
    //     instance: newInstance
    // }
    // const item = new Item(_arguments);
    return newInstance;
}

function _show(Application, model, _arguments) {

    if (!_arguments) {
        _arguments = {};
    }
    if (!_.isPlainObject(_arguments)) {
        throw new Error("Arguments must be an object!");
    }

    if (_arguments.options && !_.isPlainObject(_arguments.options)) {
        throw new Error("Parametr 'options' must be an object!");
    } else {
        _arguments.options = {};
    }

    if (_arguments.params && !_.isPlainObject(_arguments.params)) {
        throw new Error("Parametr 'params' must be an object!");
    } else {
        _arguments.params = {};
    }

    if (!_arguments.name) {
        _arguments.name = 'List';
    } else {
        _arguments.name = name;
    }

    _arguments.application = Application;
    _arguments.cube = model.cube;
    _arguments.class = model.class;
    _arguments.model = model;
    _arguments.modelName = model.modelName;

    const view = new View(_arguments);
    view.show()
        .then(config => {
            Application.window.Viewbar.addView(config);
        })
        .catch(err => {
            Log.error("Error on adding view", err);
        })
};

function _select(Application, model, options, callback) {

    function defineInclusions(model) {

        var _inclusions = new Array();

        if (model.associations) {
            for (let key in model.associations) {
                const association = model.associations[key];
                if (association.associationType === 'BelongsTo') {
                    _inclusions.push({
                        model: association.target,
                        as: association.as
                    });
                } else if (association.associationType === 'HasMany') {
                    let inclusion = {
                        model: association.target,
                        as: association.as,
                        separate: true
                    };
                    _inclusions.push(inclusion);
                    if (association.target.associations) {
                        var _subInclusions = new Array();
                        for (let nextKey in association.target.associations) {
                            const newAssociation = association.target.associations[nextKey];
                            if (newAssociation.associationType === 'BelongsTo') {
                                _subInclusions.push({
                                    model: newAssociation.target,
                                    as: newAssociation.as
                                });
                            }
                            inclusion.include = _subInclusions;
                        }
                    }
                }
            }
        }
        return _inclusions;
    }

    function mainFunction(options, callback) {
        var optionsCopy = _.clone(options);
        if (!optionsCopy) {
            optionsCopy = {};
        }
        var inclusions = defineInclusions(model);
        if (inclusions.length) {
            optionsCopy.include = inclusions;
        }
        optionsCopy.paranoid = false;
        model
            .findAll(optionsCopy)
            .then(result => {
                return callback(null, result);
            })
            .catch((error) => {
                return callback(error);
            });
    }

    if(callback) {
        return mainFunction(options, callback);
    }

    return new Promise(function (resolve, reject) {
        mainFunction(options, function (error, result) {
            error ? reject(error) : resolve(result);
        });
    });
};

module.exports = Type;