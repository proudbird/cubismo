/* globals Tools Log */
"use strict";
const _ = require("lodash");
const fs = require("fs");
const path = require("path");

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

    _private.connection.driver.sync();
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

    const table = "CT_X6F4nifo";
    qi.dropTable(table)
        .then(result => {
            Log.debug('Table ${table} is dropped');
            
            connection.getDbStructure()
                .then(curStructure => {
                    Log.debug('Got structure for ${driver.config.database}');
                    for (let key in connection.driver.models) {
                        const model = connection.driver.models[key];
                        const tableName = model.tableName;
                        if (!curStructure[tableName]) {
                            // DB doesn't have such a table, so let's create it
                            qi.createTable(model.tableName, model.attributes, model.options, model)
                                .then(result => {
                                    Log.debug('Created table ${model.tableName}');
                                })
                                .catch(err => {
                                    Log.error('Error on creating table ${model.tableName}', err);
                                });
                        }
                        else {
                            for (let key in model.attributes) {
                                const column = model.attributes[key];
                                if (!curStructure[tableName][column.fieldName]) {
                                    qi.addColumn(tableName, column.fieldName, column.type)
                                        .then(result => {
                                            Log.debug('Added column ${column.fieldName} in table ${model.tableName}');
                                        })
                                        .catch(err => {
                                            Log.error('Error on adding column ${column.fieldName} in table ${model.tableName}', err);
                                        })
                                }
                                else {
                                    // @TODO change it only, if it is possible
                                }
                            }
                        }
                    }
                })
                .catch(err => {
                    Log.error("Error on gettin DB structure", err)
                })
        })
        .catch(err => {
            Log.error("Error on trying drop table", err)
        })
        .done();


}