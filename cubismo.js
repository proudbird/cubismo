"use strict";

process.env.BLUEBIRD_WARNINGS = 0;

require("./server/Logger.js");
require("./server/Errors.js");

function run(root, port) {

  const platform = require("./server/Platform.js");
  platform.dir = root;

  const router   = require("./server/Router.js").init(platform);

  const http     = require("http");
  const server   = http.createServer(router);

  server.listen(process.env.PORT || port, process.env.IP || "0.0.0.0", function(){
    var addr = server.address();
    Log.info(`cubismo server listening at ${addr.address}:${addr.port}`);
  });
  
  const sockets = require("./server/Sockets.js");
  sockets.init(platform, server);
}

module.exports.run = run;