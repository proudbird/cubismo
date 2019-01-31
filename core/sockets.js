/* globals __ROOT Tools Platform Application Form */

var UIEventController = require("./UIEventController");

function listen(server) {
  var socketio = require("socket.io");
  var io = {};

  io = socketio.listen(server);

  io.on('connection', function (socket) {
  
    let windowId = socket.handshake.query.WindowID;
  
    if(windowId && Platform.Clients[windowId]) {
      Platform.Clients[windowId] = socket;
      Platform.Forms[windowId].Client = socket;
    }
  
    socket.on('error', function (Err) {
      console.log('socket.io gave error = > ' + Err);
    });
    
    
    socket.on('disconnect', function () {
      //sockets.splice(sockets.indexOf(socket), 1);
    });
    
    socket.on('WindowLoad', function (Message, WindowID) {
      process.env.WINDOW = WindowID;
      Platform.Clients[WindowID] = socket;
      const application = Platform.applications[Message.ApplicationID];
      application.views[Message.WindowID].client = socket;
      //Platform.views[Message.WindowID].Client = socket;
        // for(var key in Platform.Applications[Message.ApplicationID].Cubes) {
        //   var Start = Platform.Applications[Message.ApplicationID].Cubes[key].OnStart;
        //   if(Start) {
        //     Start();
        // }}

      const onLoad = application.views[Message.WindowID].onLoad;
      if(onLoad) {
        onLoad();
      }
    });
    
    socket.on('FormLoad', function (Message, WindowID) {
      process.env.WINDOW = WindowID;
      Platform.views[Message.FormID].client = Platform.Clients[WindowID];
    });
  
    socket.on('message', function (msg, WindowID) {
      process.env.WINDOW = WindowID;
      Platform.Clients[WindowID] = socket;
      if(Platform.Forms[WindowID]) {
        Platform.Forms[WindowID].Client = socket;
      }
      if(Platform.Forms[msg.FormID]) {
        Platform.Forms[msg.FormID].Client = Platform.Clients[WindowID];
      };
        try {
          process.env.USER = msg.User;
          const Application = Platform.Applications[msg.appID];
          if(!Application) {
            return;
          }
          process.env.Application = msg.appID;
          let User = Application.Users[msg.User];
          if(User) {
            User.Client = socket;
          }
          UIEventController.IncomingCall(msg);
        } catch(e) {
          console.log(e);
        }
    });
  });
  
  return io;
}

module.exports.listen = listen;