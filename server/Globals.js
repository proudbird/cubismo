module.exports = function() {
  global.__ROOT = __dirname.replace('/core','').replace('\core','');
  
  global.debug = require('debug')('http')
  
  global.SEQUELIZE = require("sequelize");
  global.DBTypes   = global.SEQUELIZE;
  global.QO        = global.SEQUELIZE.Op;

  global.sockets   = require("./sockets.js");
  
  global.Tools    = require("./Tools");
  global.log      = global._.log;
  global.Callback = global._.Callback;
  global.Window   = global._.Window;
  global.Dialog   = global._.Dialog;
  global.TEMP     = "temp/"
  global.Platform = require("./Platform");
}