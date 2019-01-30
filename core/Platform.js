/* globals __ROOT Tools */

const _    = require("lodash");
const fs   = require("fs");
const path = require("path");

const Application = require("./Application.js");

var Platform = module.exports = {};

//Platform.Applications = require("./Applications");
Platform.Forms   = {};
Platform.Clients = {};

Platform.dir = __ROOT;

Platform.LoadModule = function(ModuleName, Path) {
  
  try {
    if(process.env.NODE_ENV === "development") {
      delete require.cache[require.resolve(ModuleName)];
    }
    return require(ModuleName);
  } catch (err) {
    if (!Path) {
      Path = __ROOT;
    }
    var FileName = Tools.FindFileName(ModuleName.replace('.js','')+'.js', Path, true);
  }
  
  if (FileName) {
    if(process.env.NODE_ENV === "development") {
      delete require.cache[require.resolve(FileName)];
    }
    try {
      return require(FileName);
    } catch (ex) {
      throw new Error("Exception in module '" + ModuleName + "' => " + ex);
    }
  }
  else {
    throw new Error("Cannot find module '" + ModuleName + "'");
  }
}

Platform.applications = {};

Platform.initApplication = function(appName) {
  
  const appListFile = fs.readFileSync("appList.json", 'UTF-8');
  const appList = JSON.parse(appListFile);
  if(!appList[appName]) {
    throw new Error("There is no an application with the name <" + 
                      appName + "> in the application list. Please, add the application to the list (" + 
                      path.join(Platform.dir, "appList.json") + ")");
  };
  const application = new Application(appName, 
                                      path.join(Platform.dir, appList[appName].directory), 
                                      "Application.js");
  application.init()
  .then(() => {
    Platform.applications[appName] = application;
  })
  .catch((err) => {
    Log.error("Unsuccessful attempt to initialize application " + appName, err);
  })
  
  return application;
}