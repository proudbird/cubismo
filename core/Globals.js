module.exports = function() {
  global.__ROOT = __dirname.replace('/core','').replace('\core','');
  
  global.debug = require('debug')('http')
  
  global.SEQUELIZE = require("sequelize");
  global.DBTypes   = global.SEQUELIZE;
  global.QO        = global.SEQUELIZE.Op;

  global.sockets   = require("./sockets.js");
  
  global.Tools    = require("./Tools");
  global.log      = global.Tools.log;
  global.Callback = global.Tools.Callback;
  global.Window   = global.Tools.Window;
  global.Dialog   = global.Tools.Dialog;
  global.TEMP     = "temp/"
  global.Platform = require("./Platform");

  // global.Query = require("./Query");
  // global.AND      = global.Query.Operations.AND;
  // global.OR       = global.Query.Operations.OR;
  // global.EQ       = global.Query.Operations.EQ;
  // global.LIKE     = global.Query.Operations.LIKE;
  // global.iLIKE    = global.Query.Operations.iLIKE;
  // global.AS       = global.Query.Operations.AS;
  // global.EXISTSAS = global.Query.Operations.EXISTSAS;
}