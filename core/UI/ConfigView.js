/* global Tools */
"use strict";
const fs     = require("fs");
const path   = require("path");

const Require  = require("../Require.js");
const Traverse = require('traverse');

function ConfigView(View, _arguments, pathToFile) {

  const config = require(pathToFile).Init(View.id);

  Traverse(config).map(function(node) {
    if(node && typeof node != 'function') {
      const uiElement = node;
      if (node.view && node.name && node.name !== 'data') {
        Object.defineProperty(View, node.name, { value: { config: uiElement }, enumerable: true, writable: false });
        
        const dataValue = Tools.getPropertyByTrack(View, node.dataBind);
        if(dataValue) {
          Object.defineProperty(View[node.name], "data", { value: dataValue, enumerable: true });
        }

        const instance = View.instance;
        if(dataValue && instance) {
          const data = { id: instance.id, name: instance.Name };
          View.instance = data;
        }

        const pathToUIFile =  path.join(__dirname, uiElement.view + ".js");
        if(fs.existsSync(pathToUIFile)) {
          Require(pathToUIFile, { Application: _arguments.application, View: View, UIElement: uiElement });
        }
      }
    }
  });
}
module.exports = ConfigView;