/* global Tools */
"use strict";
const fs = require("fs");
const path = require("path");

const Require = require("../Require.js");
const Traverse = require('traverse');

let Application = undefined;

function ConfigView(View, _arguments, pathToFile) {

  Application = _arguments.application;

  var config = Require(pathToFile, {
    Application: _arguments.application
  });
  if (config.Init) {
    config = config.Init(_arguments.item ? _arguments.item : _arguments.type, _arguments.options);
  }

  Tools.traverse(config, function (node, key, parentKey) {
    //console.log(parentKey);
    if (node && typeof node != 'function') {
      const uiElement = node;
      if (node.view && node.name && node.name !== 'data') {
        if (!node.id) {
          if (node.main) {
            node.id = View.id;
          } else {
            node.id = Tools.SID();
            node.viewId = View.id;
          }
        }

        if (node.owner && node.composition === "default") {
          let pathToDefaultCommandsFile = path.join(__dirname, "./DefaultViews/Catalogs.List.Toolbar.Config.js");
          if (_arguments.item) {
            if(Tools.has(_arguments.item, node.owner)) {
              pathToDefaultCommandsFile = pathToDefaultCommandsFile.replace("List", "Collection");
            } else {
              pathToDefaultCommandsFile = pathToDefaultCommandsFile.replace("List", "Item");
            }
          }
          const toolbar = require(pathToDefaultCommandsFile).Init(node.owner, View.id);
          node.elements = toolbar;
          let owner = View[node.owner];
          if (!owner) {
            Object.defineProperty(View, node.owner, {
              value: {},
              enumerable: true,
              writable: false
            });
          }
          Object.defineProperty(View[node.owner], node.name, {
            value: {
              config: uiElement
            },
            enumerable: true,
            writable: false
          });
          
          let target = View[node.owner].Toolbar;
          _arguments.uiElement = View[node.name];

          pathToDefaultCommandsFile = pathToDefaultCommandsFile.replace(".Config", "");
          let commands = require(pathToDefaultCommandsFile);
          _arguments.view = View;
          _arguments.uiElement = target;
          if (_arguments.item) {
            pathToDefaultCommandsFile = pathToDefaultCommandsFile.replace("List", "Item");
            commands = require(pathToDefaultCommandsFile);
          }
          node.elements.forEach(command => {
            commands.defineCommand(command.name, _arguments);
          })
        } else {
          let element = View[node.name];
          if (element) {
            Object.defineProperty(element, "config", {
              value: uiElement,
              enumerable: true,
              writable: true
            });
          } else {
            Object.defineProperty(View, node.name, {
              value: {
                config: uiElement
              },
              enumerable: true,
              writable: false
            });
            element = View[node.name];
          }
          if (node.dataLink) {
            // UI element has value rpoperty and must be populated with data
            _populateDataView(View, View[node.name], node, _arguments);
          }
          if (node.select) {
            let pathToDefaultCommandsFile = path.join(__dirname, "./DefaultViews/Catalogs.List.Toolbar.js");
            let commands = require(pathToDefaultCommandsFile);
            _arguments.view = View;
            _arguments.uiElement = View[node.name];
            if (_arguments.item) {
              pathToDefaultCommandsFile = pathToDefaultCommandsFile.replace("List", "Item");
              commands = require(pathToDefaultCommandsFile);
            }
            commands.defineCommand("DefaultCmd.Add", _arguments);
          }
        }

        const pathToUIFile = path.join(__dirname, uiElement.view + ".js");
        if (fs.existsSync(pathToUIFile)) {
          Require(pathToUIFile, {
            Application: _arguments.application,
            View: View,
            UIElement: View[node.name]
          });
        }
      }
    }
  });

  View.config = config;
}

function _populateDataView(View, element, node) {

  let item = undefined;
  let modelName = undefined;
  let definition = undefined;
  let attribute = undefined;
  let dataValue = undefined;
  const linkPath = node.dataLink.split(".");
  const source = linkPath[0];
  const valueProperty = linkPath[1];
  let colDefinition;

  function __getValue(item, property) {
    let value = item.getValue(property);
    if (typeof value === "object" && value) {
      return value.getValue("Name");
    }
    return value;
  }

  function __getDataForCollection(item) {

    const data = { id: item._.instance.id, order: item._.instance.order};
    const definition = item._.model.definition;
    for (let key in definition.attributes) {
      const element = definition.attributes[key];
      let fieldId = element.fieldId;
      if(element.type.lang && element.type.lang.length) {
        fieldId = fieldId + "_" + Application.lang;
      }
      const value = item._.instance[fieldId];
      const instance = Tools.get(value, "_.instance");
      if(instance) {
        data[key] = {
          id: instance.id,
          title: instance.name
        }
      } else {
        data[key] = value;
      }
    }
    return data;
  }

  item = View[source];
  definition = item._.model.definition;
  if(definition.collections) {
    Tools.forOwn(definition.collections, collection => {
      if(collection.name === valueProperty) {
        colDefinition = collection;
        return false;
      }
    })
  }
  // UI element can be single value (text, lookup, etc.) and multy-value (all lists)
  if(colDefinition) { // only multi-value elements have 'select' option 
    const data = [];
    const collection = item[valueProperty] || [];
    for(let i=0; i < collection.length; i++) {
      const value = __getDataForCollection(collection[i]);
      const row = { 
        id: node.id + "_" + i,
        rowNumer: i, 
        value: value 
      };
      data.push(row);
    }
     
    node.data = data;
  } else { // single value element
    
    attribute = definition.attributes[valueProperty] || { type: { dataType: undefined}};
    // chack if source is a reference type
    if(valueProperty === "Owner" || valueProperty === "Parent" || attribute.type.dataType === "FK") {
      modelName = item._.model.associations[valueProperty].target.name;
    } else if(source === "item" || source === "owner" || source === "parent") {
      modelName = item._.model.name;
    }

    if(valueProperty) {
      dataValue = item.getValue(valueProperty);
    } else {
      dataValue = item;
    }

    Object.defineProperty(element, "value", {
      enumerable: true,
      get: function () {
        if(valueProperty) {
          return __getValue(item, valueProperty);
        } else {
          return item.getValue("Name");
        }
      },
      set: function (value) {
        item.setValue(valueProperty, value);
        return item;
      }
    });

    // if model name is determed, so it is a reference type and we need 'instance' property
    if(modelName) {
      node.instance = {
        type: modelName
      };
      if (Tools.isObjectLike(dataValue)) {
        node.instance.id = dataValue.getValue("id");
        node.instance.title = dataValue.getValue("Name");
      }
    }
    
    if(valueProperty) {
      node.value = __getValue(item, valueProperty);
    } else {
      node.value = item.getValue("Name");
    }
  }
}
module.exports = ConfigView;