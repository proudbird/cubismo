/* global Tools */
"use strict";
const _ = require('lodash');
const _async = require("async");

const View = require("../UI/View.js");

function Item(_arguments) {

    this._private = {};
    this._private.model = _arguments.model;
    this._private.instance = _arguments.instance;

    const Application = _arguments.application;

    const definition = this._private.model.definition;

    if (definition.owners && definition.owners.length) {
        Object.defineProperty(this, "Owner", {
            get: function () {
                return this._private.instance.Owner;
            },
            set: function (value) {
                this._private.instance.Owner = value;
                return this;
            }
        })
    }

    if (definition.multilevel) {
        Object.defineProperty(this, "Parent", {
            get: function () {
                return this._private.instance.Parent;
            },
            set: function (value) {
                this._private.instance.Parent = value;
                return this;
            }
        })
    }

    Object.defineProperty(this, "Name", {
        get: function () {
            return this._private.instance.getDataValue("Name" + Application.lang);
        },
        set: function (value) {
            return this._private.instance.setDataValue("Name" + Application.lang, value);
        }
    })

    for (let key in this._private.model.definition.attributes) {
        const attribute = definition.attributes[key];
        if (attribute.type.lang && attribute.type.lang.length) {
            Object.defineProperty(this, key, {
                get: function () {
                    return this._private.instance.getDataValue(attribute.fieldId + Application.lang);
                },
                set: function (value) {
                    return this._private.instance.setDataValue(attribute.fieldId + Application.lang, value);
                }
            })
        }
    }

    this.__proto__.show = function (_arguments) {
        if (!_arguments) {
            _arguments = {};
        }
        _arguments.type = this;
        _show(Application, this, _arguments);
    }

    this.__proto__.save = function () {
        const instance = this._private.instance;
        instance.save()
            .then(result => {
                _saveAssociations(this, result);
            })
    }

    this.__proto__.delete = async function (immediate) {
        return await _delete(this, immediate);
    }

    this.__proto__.get = function (param) {
        const instance = this._private.instance;
        return instance.get(param);
    }

    this.__proto__.getValue = function (property) {
        const definition = this._private.model.definition;
        const instance = this._private.instance;
        let value;
        let fieldId = property;
        if (property === "Name") {
            if (definition.nameLang && definition.nameLang.length) {
                fieldId = fieldId + "_" + Application.lang;
            }
        } else if (property === "Code") {
            return instance.Code;
        } else if (property === "Parent") {
            return instance.Parent;
        } else if (property === "Owner") {
            return instance.Owner;
        } else {
            const element = definition.attributes[property];
            if (element.type.lang && element.type.lang.length) {
                fieldId = fieldId + "_" + Application.lang;
            }
        }
        value = instance.getDataValue(fieldId);
        return value;
    }

    this.__proto__.setValue = function (property, value) {
        const definition = this._private.model.definition;
        let fieldId = property;
        if (property === "Name") {
            if (definition.nameLang && definition.nameLang.length) {
                fieldId = fieldId + "_" + Application.lang;
            }
        } else if (property === "Code") {

        } else {
            const element = definition.attributes[property];
            if (element.type.lang && element.type.lang.length) {
                fieldId = fieldId + "_" + Application.lang;
            }
        }
        const instance = this._private.instance;
        instance.setDataValue(fieldId, value);
        return this;
    }

    this.__proto__.isFolder = function () {
        const instance = this._private.instance;
        return instance.getDataValue("isFolder");
    }
}

function _show(Application, item, _arguments) {

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
        if (item.isFolder()) {
            _arguments.name = 'Folder';
        } else {
            _arguments.name = 'Item';
        }
    } else {
        _arguments.name = name;
    }

    _arguments.application = Application;
    _arguments.cube = item._private.model.cube;
    _arguments.class = item._private.model.class;
    _arguments.model = item._private.model;
    _arguments.modelName = item._private.model.modelName;
    _arguments.item = item;

    const view = new View(_arguments);
    view.show()
        .then(config => {
            Application.window.Viewbar.addView(config);
        })
        .catch(err => {
            Log.error("Error on adding view", err);
        })
};

function _saveAssociations(item, result) {

    function mainFunction(model, result, callback) {
        _async.forEach(model.associations, function (association, Next) {
            if (association.associationType === 'BelongsTo') {
                const setAccessor = association.accessors.set;
                const value = result[association.as];
                if (!value) {
                    return Next();
                }
                result[setAccessor](value)
                    //result[setAccessor](value.id)
                    .then(() => {
                        return Next();
                    })
                    .catch((error) => {
                        console.log('Error on saving belongs to:/n ' + error);
                        return Next(error);
                    });
            } else if (association.associationType === 'HasMany') {
                const setAccessor = association.accessors.set;
                // remove all previose data
                var hasManyModel = association.target;
                hasManyModel
                    .destroy({
                        where: {
                            [association.foreignKey]: result.id
                        }
                    })
                    .then(() => {
                        const newValues = result[association.as];
                        if (newValues && newValues.length) {
                            const addAccessor = association.accessors.add;
                            let newInstances = [];
                            for (let i = 0; i < newValues.length; i++) {
                                newValues[i][association.foreignKeyField] = result.id;
                                if (newValues[i].sequelize) {
                                    newInstances.push(newValues[i].toJSON());
                                } else {
                                    // @TODO
                                    // здесь нужно что-то делать с вложенными зависимостями
                                    newInstances.push(newValues[i]);
                                }
                            }

                            hasManyModel
                                .bulkCreate(newInstances)
                                .then(() => {
                                    Next();
                                    return null;
                                })
                                .catch((error) => {
                                    Log.error('Error on saving collection', error);
                                    return Next(error);
                                });
                        } else {
                            return Next();
                        }
                    })
                    .catch((error) => {
                        console.log(error);
                        return Next(error);
                    });
            }
        }, function (error) {
            return callback(error, result);
        });
    }

    return new Promise(function (resolve, reject) {
        mainFunction(item._private.model, result, function (error, result) {
            error ? reject(error) : resolve(result);
        });
    });
};

async function _delete(item, immediate) {
    const model = item._private.model;
    const instance = item._private.instance;
    if (immediate) {
        await instance.destroy({
            force: true
        });
        if (model.associations) {
            for (let key in model.associations) {
                const association = model.associations[key];
                if (association.associationType === 'HasMany') {
                    const setAccessor = association.accessors.set;
                    instance[setAccessor]([]);
                }
            }
        }
    } else {
        instance.dropped = true;
        await instance.save();
        await instance.destroy({
            force: false
        });
    }
};

module.exports = Item;