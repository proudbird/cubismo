/* global Tools */
"use strict";
const fs = require("fs");
const path = require("path");

const Require = require("../Require.js");
const Traverse = require('traverse');

function ConfigView(View, _arguments, pathToFile) {

  let config = Require(pathToFile, {
    Application: _arguments.application
  });
  if (config.Init) {
    config = config.Init(_arguments.item ? _arguments.item : _arguments.type, _arguments.options);
  }

  function _getValue(item, property) {
    let value = item.getValue(property);
    if (typeof value === "object" && value) {
      value = value.getValue("Name");
    }
    return value;
  }

  Traverse(config).map(function (node) {
    if (node && typeof node != 'function') {
      const uiElement = node;
      if (node.view && node.name && node.name !== 'data') {
        if (!node.id) {
          if (node.main) {
            node.id = this.node_.id = View.id;
          } else {
            node.id = this.node_.id = Tools.SID();
            node.viewId = this.node_.viewId = View.id;
          }
          this.update(node);
        }

        if (node.owner && node.composition === "default") {
          let pathToDefaultCommandsFile = path.join(__dirname, "./DefaultViews/Catalogs.List.Toolbar.Config.js");
          if (_arguments.item) {
            pathToDefaultCommandsFile = pathToDefaultCommandsFile.replace("List", "Item");
          }
          const toolbar = require(pathToDefaultCommandsFile).Init(node.owner);
          node.elements = this.node_.elements = toolbar;
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
        } else if (node.owner) {
          const ownerPath = node.owner.split(".");
          let target = View[node.owner];
          if (ownerPath.length = 2) {
            target = View[ownerPath[0]][ownerPath[1]];
          }
          //Object.defineProperty(target, node.name, { 
          //value: { config: uiElement }, enumerable: true, writable: false 
          //});
          let pathToDefaultCommandsFile = path.join(__dirname, "./DefaultViews/Catalogs.List.Toolbar.js");
          let commands = require(pathToDefaultCommandsFile);
          _arguments.view = View;
          _arguments.uiElement = target;
          if (_arguments.item) {
            pathToDefaultCommandsFile = pathToDefaultCommandsFile.replace("List", "Item");
            commands = require(pathToDefaultCommandsFile);
          }
          commands.defineCommand(node.name, _arguments);
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
            const property = node.dataLink.replace("item.", "");
            let item = _arguments.item || _arguments.options.owner;
            let modelType;
            if(_arguments.item) {
              item = _arguments.item;
              modelType = item._.model.associations[property].target.name;
            } else if(_arguments.options.owner) {

            }
            
            const definition = item._.model.definition;
            if (property === "Parent" || property === "Owner") {
              const link = item.getValue(property);
              const modelType = item._.model.associations[property].target.name;
              node.instance = this.node_.instance = { type: modelType };
              if (link) {
                node.instance.id = link.getValue("id");
                node.instance.title = link.getValue("Name");
              }
            } else {
              if (property != "id" && property != "Code" && property != "Name") {
                const attribute = definition.attributes[property];
                if (attribute.type.dataType === "FK") {
                  const link = _arguments.item.getValue(property);
                  const modelType = item._.model.associations[property].target.name;
                  node.instance = this.node_.instance = { type: modelType };
                  if (link) {
                    node.instance.id = link.getValue("id");
                    node.instance.title = link.getValue("Name");
                  }
                }
              }
            }
            Object.defineProperty(element, "value", {
              enumerable: true,
              get: function () {
                _getValue(item, property);
              },
              set: function (value) {
                item.setValue(property, value);
                return _arguments.item;
              }
            });
            node.value = this.node_.value = _getValue(item, property);
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
            commands.defineCommand("DefaultCmd.Enter", _arguments);
          }
        }

        const dataValue = Tools.getPropertyByTrack(View, node.dataBind);
        if (dataValue) {
          Object.defineProperty(View[node.name], "data", {
            value: dataValue,
            enumerable: true
          });
        }

        const item = View.item;
        if (dataValue && item) {
          const data = {
            id: item.id,
            name: item.Name
          };
          View.item = data;
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
module.exports = ConfigView;