"use strict";

const fs   = require("fs");
const path = require("path");

const Application = require("./Application.js");

const Platform = module.exports = {};

Platform.Forms = {};
Platform.Clients = {};

Platform.applications = {};

Platform.initApplication = function (appName) {

  const mainFunction = function (callback) {
    const appListFile = fs.readFileSync(path.join(Platform.dir, "applications.json"), 'UTF-8');
    const appList = JSON.parse(appListFile);
    if (!appList[appName]) {
      callback(new Error("There is no an application with the name <" +
        appName + "> in the application list. Please, add the application to the list (" +
        path.join(Platform.dir, "appList.json") + ")"));
    };
    const application = new Application(appName,
      path.join(Platform.dir, appList[appName].directory),
      "Application.js");
    application.init()
      .then(() => {
        Platform.applications[appName] = application;
        for (let key in application.Cubes) {
          const cube = application.Cubes[key];
          const start = cube.onStart;
          if (start) {
            start();
          }
        }
        callback(null, application);
      })
      .catch((err) => {
        callback(err);
      })
  }

  return new Promise(function (resolve, reject) {
    mainFunction(function (error, result) {
      error ? reject(error) : resolve(result);
    });
  });
}