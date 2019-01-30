/* global Tools */
"use strict";
const fs     = require("fs");
const path   = require("path");

const Require    = require("../Require.js");
const ConfigView = require("./ConfigView.js");

const View = require("./View.js");

function MainWindow(_arguments) {
    
    const _private = {};
    
    View.call(this, _arguments);
}
module.exports = MainWindow;