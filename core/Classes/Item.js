/* global Tools */
"use strict";
const _ = require('lodash');
const _async = require("async");

const View = require("../UI/View.js");

let Application;

function Item(_arguments) {

    this._ = {};
    this._.model = _arguments.model;
    this._.instance = _arguments.instance;
    this._.application = _arguments.application;

    Application = _arguments.application;

    const definition = this._.model.definition;

    if (definition.owners && definition.owners.length) {
        Object.defineProperty(this, "Owner", {
            get: function () {
                return this._.instance.Owner;
            },
            set: function (value) {
                this._.instance.Owner = value;
                return this;
            }
        })
    }

    if (definition.multilevel) {
        Object.defineProperty(this, "Parent", {
            get: function () {
                return this._.instance.Parent;
            },
            set: function (value) {
                this._.instance.Parent = value;
                return this;
            }
        })
    }

    Object.defineProperty(this, "Name", {
        get: function () {
            return this._.instance.getDataValue("Name" + this._.application.lang);
        },
        set: function (value) {
            return this._.instance.setDataValue("Name" + this._.application.lang, value);
        }
    })

    for (let key in this._.model.definition.attributes) {
        const attribute = definition.attributes[key];
        if (attribute.type.lang && attribute.type.lang.length) {
            Object.defineProperty(this, key, {
                get: function () {
                    return this._.instance.getDataValue(attribute.fieldId + this._.application.lang);
                },
                set: function (value) {
                    return this._.instance.setDataValue(attribute.fieldId + this._.application.lang, value);
                }
            })
        }
    }

    for (let key in this._.model.definition.collections) {
        const collection = definition.collections[key];
        Object.defineProperty(this, collection.name, { 
            enumerable: true,
            get: function () {
                const items = [];
                const values = this._.instance[collection.name] || [];
                values.forEach(item => {
                    const _arg = {};
                    _arg.application = this._.application;
                    _arg.instance = item;
                    _arg.model    = this._.model.associations[collection.name].target;
                    const newItem = new Item(_arg);
                    items.push(newItem);
                })
                return items;
            },
            set: async function (values) {
                await this._.instance[this._.model.associations[collection.name].accessors.set](values);
                return this;
            }
        });
        const self = this;
        this[collection.name].__proto__.add = function(value) {
            if(!value) {
                value = { 
                    order: this.length + 1,
                    ownerId: self._.instance.id
                };
                for (let key in collection.attributes) {
                    const element = collection.attributes[key];
                    let fieldId = element.fieldId;
                    if(element.type.lang && element.type.lang.length) {
                        fieldId = fieldId + "_" + self._.application.lang;
                    }
                    value[fieldId] = null;
                }
            }
            const _arg = {};
            _arg.instance = self._.model.associations[collection.name].target.build(value);
            _arg.model    = self._.model.associations[collection.name].target;
            const newItem = new Item(_arg);
            //const newItem = self._.model.associations[collection.name].target.build(value);
            const values = self._.instance[collection.name] || [];
            values.push(_arg.instance);
            return newItem;
        }
        this[collection.name].__proto__.addMultiple = async function(values) {
            await self._.instance[self._.model.associations[collection.name].accessors.addMultiple](values);
            return self;
        }
        this[collection.name].__proto__.count = function() {
            return self._.instance[collection.name].length;
        }
        this[collection.name].__proto__.remove = async function() {
            await self._.instance[self._.model.associations[collection.name].accessors.remove]();
            return self;
        }
    }

    this.__proto__.show = function (_arguments) {
        if (!_arguments) {
            _arguments = {};
        }
        _arguments.type = this;
        _show(this._.application, this, _arguments);
    }

    this.__proto__.save = function () {
        const self = this;
        const instance = this._.instance;
        const isNewRecord = instance.isNewRecord;
        instance.save()
            .then(result => {
                _saveAssociations(this, result);
                if(Tools.has(self, "_.model.subscribers")) {
                    Tools.forOwn(self._.model.subscribers, subscriber => {
                        subscriber.update(self, isNewRecord ? "create" : "update");
                    }) 
                }
            })
    }

    this.__proto__.delete = async function (immediate) {
        const self = this;
        await _delete(this, immediate);
        if(Tools.has(self, "_.model.subscribers")) {
            Tools.forOwn(self._.model.subscribers, subscriber => {
                subscriber.update(self, "delete");
            }) 
        } 
    }

    this.__proto__.get = function (param) {
        const instance = this._.instance;
        return instance.get(param);
    }

    this.__proto__.set = function (param1, param2, param3) {
        const instance = this._.instance;
        return instance.set(param1, param2, param3);
    }

    this.__proto__.getValue = function (property) {
        const definition = this._.model.definition;
        const instance = this._.instance;
        let value;
        let fieldId = property;
        if (property === "Name") {
            if (definition.nameLang && definition.nameLang.length) {
                fieldId = fieldId + "_" + this._.application.lang;
            }
        } else if (property === "id") {
            return instance.id;
        } else if (property === "Code") {
            return instance.Code;
        } else if (property === "Parent") {
            return instance.Parent;
        } else if (property === "Owner") {
            return instance.Owner;
        } else {
            const element = definition.attributes[property];
            if (element.type.lang && element.type.lang.length) {
                fieldId = fieldId + "_" + this._.application.lang;
            }
        }
        value = instance.getDataValue(fieldId);
        return value;
    }

    this.__proto__.setValue = function (property, value) {
        const model = this._.model;
        const definition = this._.model.definition;
        const instance = this._.instance;
        let fieldId = property;
        if (property === "Name") {
            if (definition.nameLang && definition.nameLang.length) {
                fieldId = fieldId + "_" + this._.application.lang;
            }
        } else if (property === "id") {
            throw new Error("It is not allowed to change 'id' of an item");
        } else if (property === "Code") {
            fieldId = "Code";
        } else if (property === "Parent") {
            instance.Parent = value;
            if(value) {
                instance.setDataValue("parentId", value.getValue("id"));
            } else {
                instance.setDataValue("parentId", null);
            }
            return this;
        } else if (property === "Owner") {
            instance.Parent = value;
            if(value) {
                instance.setDataValue("ownerId", value.getValue("id"));
            } else {
                instance.setDataValue("ownerId", null);
            }
            return this;
        } else {
            const element = definition.attributes[property];
            if (element.type.lang && element.type.lang.length) {
                fieldId = element.fieldId + "_" + this._.application.lang;
            }
            if (element.type.dataType === "FK") {
                instance[property] = value;
                fieldId = model.associations[property].identifier;
                if(value) {
                    instance.setDataValue(fieldId, value.getValue("id"));
                } else {
                    instance.setDataValue(fieldId, null);
                }
                return this;
            }
        }
        instance.setDataValue(fieldId, value);
        return this;
    }

    this.__proto__.isFolder = function () {
        const instance = this._.instance;
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
    _arguments.cube = item._.model.cube;
    _arguments.class = item._.model.class;
    _arguments.model = item._.model;
    _arguments.modelName = item._.model.modelName;
    _arguments.item = item;

    const view = new View(_arguments);
    view.show()
        .then(viewConfig => {
            Application.window.Viewbar.addView(viewConfig.config);
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
                let value = result[association.as];
                if (!value) {
                    return Next();
                }
                if (!value._.instance) {
                    return Next();
                }
                value = value._.instance;
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
        mainFunction(item._.model, result, function (error, result) {
            error ? reject(error) : resolve(result);
        });
    });
};

async function _delete(item, immediate) {
    const model = item._.model;
    const instance = item._.instance;
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