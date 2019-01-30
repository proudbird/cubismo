/* globals __ROOT Tools Platform SEQUELIZE INFO WARN*/
"use strict";

const _ = require("lodash");
const fs = require("fs");
const path = require("path");

class Connection {

  constructor(app) {

    const configFileName = path.join(app.dirname, "config.json");
    if (!fs.existsSync(configFileName)) {
      throw new Error("Can't start the application <" + app.name + ">, because there is no a database config file (" + configFileName + ")");
    };
    const configFile = fs.readFileSync(configFileName, 'UTF-8');
    const dbConfig = JSON.parse(configFile).database;
    this.driver = new SEQUELIZE(
      dbConfig.name,
      dbConfig.user,
      dbConfig.password,
      dbConfig.options
    );

    if (dbConfig.options.dialect === "postgres") {
      this.provider = require("./postgres.js");
    }
    else {
      return;
    }

    this.driver.authenticate()
      .then(function() {
        Log.info("Databese for the application <" + app.name + "> is connected.");
      })
      .catch(function(err) {
        Log.warn("Can't connect to the databese for the application <" + app.name + ">. Please, check the database config (" + configFileName + ")", err);
      })
      .done();
  }

  query(query, model, callback) {
    const self = this;

    function mainFunction(callback) {
      self
        .query(query, model ? { model: model } : undefined)
        .then(result => {
          return callback(null, result);
        })
        .catch((error) => {
          return callback(error);
        });
    }

    if (callback) {
      return mainFunction(callback);
    }

    return new Promise(function(resolve, reject) {
      mainFunction(function(error, result) {
        error ? reject(error) : resolve(result);
      });
    });
  }

  getDbStructure(callback) {
    const self = this;

    const mainFunction = function(callback) {
      self.provider.getDbStructure(self.driver)
        .then((result) => {
          return callback(null, result);
        })
        .catch((error) => {
          return callback(error);
        });
    };

    if (callback && typeof callback === "object") {
      return mainFunction(callback);
    }

    return new Promise(function(resolve, reject) {
      mainFunction(function(error, result) {
        error ? reject(error) : resolve(result);
      });
    });
  }

  createTable(callback) {
    const self = this;

    const mainFunction = function(callback) {
      this.provider.createTable(self.driver)
        .then((result) => {
          return callback(null, result);
        })
        .catch((error) => {
          return callback(error);
        });
    };

    if (callback && typeof callback === "object") {
      return mainFunction(callback);
    }

    return new Promise(function(resolve, reject) {
      mainFunction(function(error, result) {
        error ? reject(error) : resolve(result);
      });
    });
  }
}
module.exports = Connection;
