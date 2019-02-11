/* globals __ROOT Tools Platform Log*/
const  path = require('path');

process.env.NODE_ENV= "development";
process.env.BLUEBIRD_WARNINGS = 0;

process.env.LANG = "ru";

process.on('uncaughtException', function (err) {
  const _stack = err.stack.split('\n');
  let newStack = [];
  for(let i = 0; i < _stack.length; i++) {
    //if(_stack[i].includes(path.join(__dirname, "core"))) {
      newStack.push(_stack[i]);
    //}
  }
  newStack = newStack.join('\n');
  console.log('\n');
  console.log('Caught exception: ' + err);
  console.log(newStack);
  console.log('\n');
});

process.on('unhandledRejection', function (err) {
  //const _stack = err.stack.split('\n');
  //let newStack = [];
  //for(let i = 0; i < _stack.length; i++) {
    //if(_stack[i].includes(path.join(__dirname, "core"))) {
      //newStack.push(_stack[i]);
    //}
  //}
  //newStack = newStack.join('\n');
  console.log('\n');
  console.log('Caught promise exception: ' + err);
  //console.log(newStack);
  console.log('\n');
});

require("./core/Logger.js");
require("./core/Globals.js")();
require("./core/TempStorage.js");

var router = require("./core/Router.js");
var http   = require("http");
var server = http.createServer(router);

server.listen(process.env.PORT || 21021, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("cubismo server listening at " + addr.address + ":" + addr.port);
});

sockets.listen(server);