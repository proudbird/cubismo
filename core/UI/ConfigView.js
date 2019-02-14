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
    config = config.Init(_arguments.item ? _arguments.item : _arguments.type);
  }

  function _getValue(item, property) {
    let value = item.getValue(property);
    if(typeof value === "object" && value) {
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
            Object.defineProperty(element, "value", {
              enumerable: true,
              get: function () {
                _getValue(_arguments.item, property);
              },
              set: function (value) {
                _arguments.item.setValue(property, value);
                return _arguments.item;
              }
            });
            node.value = this.node_.value = _getValue(_arguments.item, property);
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