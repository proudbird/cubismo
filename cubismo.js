/* globals __ROOT Tools Platform Log*/

process.env.NODE_ENV= "development";
process.env.BLUEBIRD_WARNINGS = 0;

process.on('uncaughtException', function (err) {
  const _stack = err.stack.split('\n');
  let newStack = [];
  for(let i = 0; i < _stack.length; i++) {
    //if(_stack[i].includes("D:\\cubismo\\apps\\detalio")) {
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
  const _stack = err.stack.split('\n');
  let newStack = [];
  for(let i = 0; i < _stack.length; i++) {
    //if(_stack[i].includes("D:\\cubismo-p\\apps\\Test")) {
      newStack.push(_stack[i]);
    //}
  }
  newStack = newStack.join('\n');
  console.log('\n');
  console.log('Caught promise exception: ' + err);
  console.log(newStack);
  console.log('\n');
});

require("./core/Logger.js");
require("./core/Globals.js")();
require("./core/TempStorage.js");

var router = require("./core/Router.js");
var http   = require("http");
var server = http.createServer(router);

server.testName = "platform";
server.listen(process.env.PORT || 21021, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("cubismo server listening at " + addr.address + ":" + addr.port);
});

sockets.listen(server);

// if (!Platform.Applications["detalio"]) {
//   Platform.Applications.Init("detalio", "detalio");
//   for(var key in Platform.Applications["detalio"].Cubes) {
//     var Start = Platform.Applications["detalio"].Cubes[key].OnStart;
//     if(Start) {
//       Start();
//   }}
// }

Platform.initApplication("Just-In-Time")
.then((application) => {
  for(let key in application.Cubes) {
    const cube = application.Cubes[key];
    const start = cube.onStart;
    if(start) {
      start();
    }
  }
})
.catch(err => {
  console.log(err);
})