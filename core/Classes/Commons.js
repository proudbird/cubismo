/* globals Tools Log Application Model*/
'use strict';
const _      = require('lodash');
const _async = require("async");

const View = require("../UI/View.js");

Model.New = function(PredefinedValues, callback) {
    var newInstance = PredefinedValues;
    if (PredefinedValues && PredefinedValues.isNewRecord !== false) {
        newInstance = this.build(PredefinedValues);
    }
    else {
        newInstance = this.build(PredefinedValues);
    }

    if (this.associations instanceof Object) {
        var associations = this.associations;
        for (let key in associations) {
            if (associations[key].associationType === "HasMany") {
                newInstance[associations[key].as] = [];
            }
        }
    }

    if (PredefinedValues) {
        for (let key in PredefinedValues) {
            if (!newInstance[key] && this.associations[key]) {
                newInstance[key] = PredefinedValues[key];
            }
        }
    }
    return newInstance;
};

Model.Select = function(Options, Callback) {
    var self = this;

    function defineInclusions(model) {

        var _inclusions = new Array();

        if (model.associations) {
            for (let key in model.associations) {
                const association = model.associations[key];
                if (association.associationType === 'BelongsTo') {
                    _inclusions.push({ model: association.target, as: association.as });
                }
                else if (association.associationType === 'HasMany') {
                    let inclusion = { model: association.target, as: association.as, separate: true };
                    _inclusions.push(inclusion);
                    if (association.target.associations) {
                        var _subInclusions = new Array();
                        for (let nextKey in association.target.associations) {
                            const newAssociation = association.target.associations[nextKey];
                            if (newAssociation.associationType === 'BelongsTo') {
                                _subInclusions.push({ model: newAssociation.target, as: newAssociation.as });
                            }
                            inclusion.include = _subInclusions;
                        }
                    }
                }
            }
        }
        return _inclusions;
    }

    function mainFunction(Options, callback) {
        var optionsCopy = _.clone(Options);
        if (!optionsCopy) {
            optionsCopy = {};
        }
        var inclusions = defineInclusions(self);
        if (inclusions.length) {
            optionsCopy.include = inclusions;
        }
        self
            .findAll(optionsCopy)
            .then(result => {
                return callback(null, result);
            })
            .catch((error) => {
                return callback(error);
            });
    }

    if (Callback) {
        return mainFunction(Options, Callback);
    }

    return new Promise(function(resolve, reject) {
        mainFunction(Options, function(error, result) {
            error ? reject(error) : resolve(result);
        });
    });
};

Model.prototype.Save = function(Callback) {
    var self = this;

    function saveAssociations(Model, result, callback) {
        _async.forEach(Model.associations, function(association, Next) {
            if (association.associationType === 'BelongsTo') {
                const setAccessor = association.accessors.set;
                const value = result[association.as];
                result[setAccessor](value)
                    //result[setAccessor](value.id)
                    .then(() => {
                        return Next();
                    })
                    .catch((error) => {
                        console.log('Error on saving belongs to:/n ' + error);
                        return Next(error);
                    });
            }
            else if (association.associationType === 'HasMany') {
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
                                }
                                else {
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
                        }
                        else {
                            return Next();
                        }
                    })
                    .catch((error) => {
                        console.log(error);
                        return Next(error);
                    });
            }
        }, function(error) {
            return callback(error, result);
        });
    }

    function mainFunction(callback) {
        self
            .save()
            .then(result => {
                if (Model.associations) {
                    saveAssociations(Model, result, function(error) {
                        return callback(error, result);
                    });
                }
            })
            .catch((error) => {
                // console.log('Error on saving instanse:/n ' + error);
                callback(error);
                return error;
            });
    }

    if (Callback) {
        return mainFunction(Callback);
    }

    return new Promise(function(resolve, reject) {
        mainFunction(function(error, result) {
            error ? reject(error) : resolve(result);
        });
    });
};

Model.prototype.Delete = function(Immediate, Callback) {
    var self = this;

    let mainFunction;
    if (Immediate) {
        mainFunction = function(callback) {
            self
                .destroy()
                .then(() => {
                    if (Model.associations) {
                        for (let key in Model.associations) {
                            const association = Model.associations[key];
                            if (association.associationType === 'HasMany') {
                                const setAccessor = association.accessors.set;
                                self[setAccessor]([]);
                                callback(null);
                                return null;
                            }
                        }
                    }
                    return callback(null);
                })
                .catch((error) => {
                    return callback(error);
                });
        };
    }
    else {
        mainFunction = function(callback) {
            self.Deleted = true;
            self.save()
                .then(() => {
                    return callback(null);
                })
                .catch((error) => {
                    return callback(error);
                });
        };
    }

    if (Callback) {
        return mainFunction(Callback);
    }

    return new Promise(function(resolve, reject) {
        mainFunction(function(error, result) {
            error ? reject(error) : resolve(result);
        });
    });
};

Model.prototype.GetPlainData = function(filter) {
    let data = this.get();
    let copy = {};
    for (let i in filter) {
        copy[filter[i]] = _.get(data, filter[i]);
    }
    return copy;
};

Model.prototype.ShowForm = function(FormName, Params, callbackOnShow, callbackOnClose) {
    if (!FormName) {
        if (this.IsFolder) {
            FormName = 'FolderForm';
        }
        else {
            FormName = 'InstanceForm';
        }
    }
    if (!Params) {
        Params = {};
    }
    Params.Instance = this;
    var Form = Application.InitForm(
        FormName,
        Application,
        Model.Cube,
        Model.Type,
        Model.Name);
    Form.Show(Params, callbackOnShow, callbackOnClose);
};

Model.showView = function(_arguments) {

    if(!_arguments) {
        _arguments = {};
    }
    if(!_.isPlainObject(_arguments)) {
        throw new Error("Arguments must be an object!");
    }
    
    if(_arguments.options && !_.isPlainObject(_arguments.options)) {
        throw new Error("Parametr 'options' must be an object!");
    } else {
        _arguments.options = {};
    }
    
    if(_arguments.params && !_.isPlainObject(_arguments.params)) {
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
    _arguments.cube        = Model.cube;
    _arguments.class       = Model.class;
    _arguments.modelName   = Model.modelName;

    const view = new View(_arguments);
    view.show();
};

Model.lookUp = function(FormName, modal, Params, callbackOnShow, callbackOnClose) {
    if (!FormName) {
        FormName = 'ListForm';
    }
    if (!Params) {
        Params = {};
    }
    Params.model = Model;
    var Form = Application.InitForm(
        FormName,
        Application,
        Model.Cube,
        Model.Type,
        Model.Name);
    Form.Show(Params, modal, undefined, callbackOnShow, callbackOnClose);
};