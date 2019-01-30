/* globals Tools Log */
"use strict";
const _ = require("lodash");
const fs = require("fs");
const path = require("path");
const _async = require("async");

const _require = require("./Require");

const constructors = {};
constructors.Base = require('./Classes/Base.js');
constructors.Collection = require('./Classes/Collection.js');
constructors.Cubes = require('./Classes/Cubes.js');
constructors.Cube = require('./Classes/Cube.js');
constructors.Common = require('./Classes/Common.js');
constructors.Сonstants = require('./Classes/Сonstants.js');
constructors.Catalogs = require('./Classes/Catalogs.js');
constructors.Recorders = require('./Classes/Recorders.js');
constructors.Registers = require('./Classes/Registers.js');
constructors.Enumerations = require('./Classes/Enumerations.js');

const DBConnection = require('./DB/Connection.js');
const ModelGenerator = require('./ModelGenerator.js');

function Application(name, dirname, filename) {

    const _private = {};

    constructors.Collection.call(this, undefined, undefined, name, dirname, filename);

    _private.connection = new DBConnection(this);

    _private.modelDefinition = {};

    defineApplicationStructure(this, _private.modelDefinition);

    defineModelStructure(this, _private.connection.driver, _private.modelDefinition);

    syncDBStructure(this, _private.connection);

    //_private.connection.driver.sync();
}

module.exports = Application;

function defineApplicationStructure(application, appModelDefinition) {

    const appDir = application.dirname;
    const registredClasses = ["Common", "Сonstants", "Catalogs", "Recorders", "Registers", "Enumerations"];

    const _cubes = new constructors.Cubes(application, undefined, undefined, application.filename, undefined)
    application.addElement("Cubes", _cubes);


    const files = fs.readdirSync(appDir);
    for (let i = 0; i < files.length; i++) {
        let cubeFile = files[i];
        let cubeDir = path.join(appDir, cubeFile);
        if (fs.statSync(cubeDir).isDirectory()) {
            if (cubeFile.match(/\.|\../) == null) {
                let cubeName = cubeFile;
                let cubeModuleFile = path.join(cubeDir, 'Cube.js');
                if (fs.existsSync(cubeModuleFile)) {

                    const _cube = new constructors.Cube(application, undefined, cubeName, cubeDir, "Cube.js")
                    application.addElement(cubeName, _cube);
                    _cubes.addElement(cubeName, _cube);

                    registredClasses.forEach(className => {
                        const _constructor = constructors[className];
                        const _class = new _constructor(application, _cube, className, cubeDir, undefined);
                        _cube.addElement(className, _class);
                    });

                    const _commonModules = new constructors.Collection(application, _cube, "Modules", path.join(cubeDir, "Common", "Modules"), undefined);
                    const _common = _cube.Common;
                    _common.addElement("Modules", _commonModules);

                    let cubeFiles = fs.readdirSync(cubeDir);
                    for (let i = 0; i < cubeFiles.length; i++) {

                        let classFile = cubeFiles[i];
                        let classDir = path.join(cubeDir, classFile);
                        if (fs.statSync(classDir).isDirectory()) {
                            let className = classFile;
                            if (!registredClasses.includes(className)) {
                                continue;
                            }

                            let modelName = undefined;
                            let modelModuleFile = undefined;
                            let modelDefinition = undefined;
                            let modelDefinitionName = undefined;

                            let classFiles = fs.readdirSync(classDir);
                            for (let i = 0; i < classFiles.length; i++) {
                                let classFile = classFiles[i];
                                let splitedName = classFile.split(".");
                                if (splitedName[0] === className && splitedName[2] === "js") {
                                    modelName = splitedName[1];
                                    modelModuleFile = path.join(classDir, classFile);
                                }
                                if (splitedName[0] === className && splitedName[2] === "Model" && splitedName[3] === "json") {
                                    modelDefinitionName = splitedName[1];
                                    modelDefinition = require(path.join(classDir, classFile));
                                }
                                if (className === "Common" &&
                                    splitedName[0] === className &&
                                    splitedName[1] === "Modules" &&
                                    splitedName[3] === "js") {
                                    const commonModuleName = splitedName[2];

                                    const _commonModules = _cube.Common.Modules;
                                    const _module = new constructors.Base(application, _cube, commonModuleName, path.join(cubeDir, "Common", "Modules"), classFile);
                                    _commonModules.addElement(commonModuleName, _module);
                                }

                                /**
                                 * @todo There can be poblems on parsing object files
                                 * @todo Should change the algorithm
                                 */
                                if (modelDefinition && modelDefinitionName && modelName === modelDefinitionName) {
                                    for (let key in modelDefinition) {
                                        modelDefinition[key].id = key;
                                        appModelDefinition[key] = {
                                            definition: modelDefinition[key],
                                            module: modelModuleFile
                                        };
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

function defineModelStructure(application, connection, appModelDefinition) {

    ModelGenerator.on("modelready", function(model, moduleFile) {
        // firstly load common methods for the class
        _require(path.join(__dirname, "./Classes/Commons.js"), { Application: application, Model: model, Tools: Tools, Log: Log });
        // then load specific methods for the class
        _require(path.join(__dirname, "./Classes/" + model.class + ".Model.js"), { Application: application, Model: model, Tools: Tools, Log: Log });
        // then load methods, determined in model module
        _require(moduleFile, { Application: application, Module: model, Tools: Tools, Log: Log });
        // bind model to the class
        const _class = application[model.cube.name][model.class];
        _class.addElement(model.modelName, model);
    });

    ModelGenerator.define(application, connection, appModelDefinition);
}

function syncDBStructure(application, connection) {

    const driver = connection.driver;
    const qi = driver.queryInterface;

    const safeChanges = [];
    const unSafeChanges = [];
    
    const serviceFields = ["id", "droped", "isFolder", 
            "booked", "Date", "parentId", "ownerId",
            "createdAt", "updatedAt", "deletedAt", "order"];

    function changeColumn(tableName, modelCol, dbCol, rows) {

        let type;
        let length;
        if(dbCol.type.includes("CHARACTER VARYING")) {
            type = "STRING";
            const start = dbCol.type.indexOf("(") + 1;
            const end = dbCol.type.indexOf(")");
            length = parseInt(dbCol.type.substring(start, end));
        } else {
            type = modelCol.type;
        }

        if(type === "STRING" === modelCol.type.key) {
            if(length === modelCol.type._length) {
                // nothing to change
            } else if(length < modelCol.type._length) {
                safeChanges.push({ 
                    action:    "changeColumn",
                    message:    "Object attribute modified (" + modelCol.field + ")",
                    tableName:  tableName, 
                    key:        modelCol.field, 
                    attribute:  { type: modelCol.type }
                });
            } else {
                if(!rows) {
                    // table doesn't have rows, so we can change column without data loss
                    safeChanges.push({ 
                        action:    "changeColumn",
                        message:    "Object attribute modified (" + modelCol.field + ")",
                        tableName:  tableName, 
                        key:        modelCol.field, 
                        attribute:  { type: modelCol.type }
                    });
                } else {
                    unSafeChanges.push({ 
                        action:    "changeColumn",
                        message:    "Object attribute modified (" + modelCol.field + ")",
                        tableName:  tableName, 
                        key:        modelCol.field, 
                        attribute:  { type: modelCol.type }
                    });
                }
            }
        } else {
            if(!rows) {
                // table doesn't have rows, so we can change column without data loss
                safeChanges.push({ 
                    action:    "changeColumn",
                    message:    "Object attribute modified (" + modelCol.field + ")",
                    tableName:  tableName, 
                    key:        modelCol.field, 
                    attribute:  { type: modelCol.type }
                });
            } else {
                unSafeChanges.push({ 
                    action:    "changeColumn",
                    message:    "Object attribute modified (" + modelCol.field + ")",
                    tableName:  tableName, 
                    key:        modelCol.field, 
                    attribute:  { type: modelCol.type }
                });
            }
        }
    }

    function compareColumns(model, tableName, description, dbStructure) {
        var self = this;

        const mainFunction = function(callback) {
            _async.forEach(model.fieldRawAttributesMap, function(modelCol, next) {
                if (!description[modelCol.field]) {
                    // table doesn't have such a column, so let's add it
                    safeChanges.push({ 
                        action:    "addColumn",
                        message:    "Object attribute added (" + modelCol.field + ")",
                        tableName:  tableName, 
                        key:        modelCol.field, 
                        attribute:  { type: modelCol.type }
                    });
                    // delete column from the list - it will allow us to detect those columns we need to delete
                    delete dbStructure[tableName][modelCol.field];
                    return next(null);
                } else {
                    // table in DB has such a column
                    if(serviceFields.includes(modelCol.field)) {
                        // no needs to change service fields
                        return next(null);
                    } else {
                        const dbCol = description[modelCol.field];
                        model.count()
                        .then(rows => {
                            changeColumn(tableName, modelCol, dbCol, rows);
                            // delete column from the list - it will allow us to detect those columns we need to delete
                            try {
                                delete dbStructure[tableName][modelCol.field];
                            } catch(err) {

                            }
                            return next(null);
                        })
                        .catch(err => {
                            // delete column from the list - it will allow us to detect those columns we need to delete
                            //delete dbStructure[tableName][modelCol.field];
                            return next(err);
                        });
                    }
                }
            }, function(err) {
                callback(err);
            });
        };

        return new Promise(function(resolve, reject) {
            mainFunction(function(error, result) {
                error ? reject(error) : resolve(result);
            });
        });
    }

    function compareTables(driver, dbStructure) {
        var self = this;

        const mainFunction = function(callback) {
            _async.forEach(driver.models, function(model, next) {
                const tableName = model.tableName;
                if (!dbStructure[tableName]) {
                    // DB doesn't have such a table, so let's create it
                    safeChanges.push({ 
                        action:    "ctreateTable",
                        message:    "New object added (" + model.tableName + ")",
                        tableName:  model.tableName, 
                        attributes: model.attributes, 
                        options:    model.options, 
                        model:      model
                    });
                    next();
                } else {
                    qi.describeTable(tableName)
                    .then(description => {
                        // delete table from the list - it will allow us to detect those table we need to drop
                        delete dbStructure[tableName];
                        return compareColumns(model, tableName, description, dbStructure)
                    })
                    .then(() => { next(null) })
                    .catch(err => {
                        next(err);
                    });
                }
            }, function(err) {
                callback(err);
            });
        }
        
        return new Promise(function(resolve, reject) {
            mainFunction(function(error, result) {
                error ? reject(error) : resolve(result);
            });
        });
    }

    function askChanges() {
        function log(message) {
            console.log(message);
        }

        const mainFunction = function(callback) {
            if(!safeChanges.length && !unSafeChanges.length) {
                callback(null);
            }

            log("----------------------------------------------------");
            log("Changes in application structure:".toUpperCase());
            log("----------------------------------------------------");
            
            if(safeChanges.length ) {
                log("Safe changes:");
                safeChanges.forEach(change => {
                    log("  " + change.message + ": " + change.tableName);
                })
            }

            log(" ");

            if(unSafeChanges.length ) {
                log("Unsafe changes (data loss possible):");
                unSafeChanges.forEach(change => {
                    log("  " + change.message + ": " + change.tableName);
                })
            }
            log("----------------------------------------------------");
            log(" ");

            const readline = require('readline');

            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            rl.question('Do you want to execute listed changes? (Y/N): ', (answer) => {
                if(answer.toUpperCase() === "Y") {
                    rl.close();
                    callback(null, true);
                } else if(answer.toUpperCase() === "N") {
                    rl.close();
                    callback(null, false);
                }
            });
        }

        return new Promise(function(resolve, reject) {
            mainFunction(function(error, result) {
                error ? reject(error) : resolve(result);
            });
        });
    }

    function executeChanges() {
        qi.createTable(model.tableName, model.attributes, model.options, model)
        .then(result => {
            Log.debug('Created table ' + model.tableName);
        })
        .catch(err => {
            Log.error('Error on creating table ' + model.tableName, err);
        });

        qi.addColumn(tableName, column.field, {type: column.type})
        .then(result => {
            Log.debug('Added column ' + column.field + ' in table ' + model.tableName);
        })
        .catch(err => {
            Log.error('Error on adding column ' + column.field + ' in table ' + model.tableName, err);
        })

        qi.changeColumn(tableName, column.field, {type: column.type})
        .then(result => {
            Log.debug('Changeded column ' + column.field + ' in table ' + model.tableName);
        })
        .catch(err => {
            Log.error('Error on changing column ' + column.field + ' in table ' + model.tableName, err);
        })
    }

    connection.getDbStructure()
    .then(dbStructure => {
        return compareTables(driver, dbStructure)
    })
    .then(() => {
        return askChanges()
    })
    .then((result => {
        if(result) {
            return executeChanges();
        } else {
            // NOTHING TO DO
            return;
        }
    }))
    .catch(err => {
        Log.error("Error on gettin DB structure", err)
    })
}