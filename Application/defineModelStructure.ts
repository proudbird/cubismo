//const SystemData     = require('./DB/SystemData.js');
const ModelGenerator = require('./ModelGenerator.js');
//const Type    = require('../ApplicationTypes/Type.js');

export default function defineModelStructure(cubismo, application, connection, appModelDefinition) {

  ModelGenerator.on("modelready", function(model, moduleFile) {
      // firstly load common methods for the class
      //Require(path.join(__dirname, "./Classes/Commons.js"), { Application: application, Model: model, Tools: Tools, Log: Log });
      // then load specific methods for the class
      //Require(path.join(__dirname, "./Classes/" + model.class + ".Model.js"), { Application: application, Model: model, Tools: Tools, Log: Log });
      // then load methods, determined in model module
      //Require(moduleFile, { Application: application, Module: model, Tools: Tools, Log: Log });
      // bind model to the class
      const _class = application[model.cube.name][model.class];
      //_class.addElement(model.modelName, model);

      const _arguments = {
          application: application,
          model: model
      }
      //const _type = new Type(_arguments);
      //_class.addElement(_type.name, _type);
  });

  ModelGenerator.define(cubismo, application, connection, appModelDefinition);
}