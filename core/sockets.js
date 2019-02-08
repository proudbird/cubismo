/* globals __ROOT Tools Platform Application Form */

var UIEventController = require("./UIEventController");

function listen(server) {
  var socketio = require("socket.io");
  var io = {};

  io = socketio.listen(server);

  io.on('connection', function (socket, callback) {

    const applicationId = socket.handshake.query.applicationId;
    const application = Platform.applications[applicationId];
    if(!application) {
      const err = "Application <" + applicationId + "> is not defined.";
      if(callback) {
        callback(err);
      } else { 
        return Log.error(err);
      }
    } else {
      application.show(socket)
      .then((view) => {
        var viewConfig = JSON.stringify(view, function(key, value) {
          if (typeof value === "function") {
            return "/Function(" + value.toString() + ")/";
          }
          return value;
        });
        socket.emit("window", viewConfig);
      })
    }

    socket.on('error', function (Err) {
      console.log('socket.io gave error = > ' + Err);
    });
    
    socket.on('disconnect', function () {
      //sockets.splice(sockets.indexOf(socket), 1);
    });

    socket.on('event', function (action, callback) {
      process.env.WINDOW = action.windowId;

      const application = Platform.applications[action.applicationId];
      if(!application) {
        const err = "Application <" + action.applicationId + "> is not defined.";
        if(callback) {
          callback(err);
        } else { 
          return Log.error(err);
        }
      }

      const view = application.views[action.viewId];
      if(!view) {
        const err = "View with ID <" + action.viewId + "> is not defined.";
        if(callback) {
          callback(err);
        } else { 
          return Log.error(err);
        }
      }

      const uiElement = view[action.element];
      if(!uiElement) {
        const err = "UI element with name <" + action.element + "> is not defined.";
        if(callback) {
          callback(err);
        } else { 
          return Log.error(err);
        }
      }

      const procedure = uiElement.config.events[action.event];
      if(procedure) {
        const eventHandler = view[procedure];
        if(eventHandler) {
          try {
            const _arguments = action.arguments || [];
            eventHandler(_arguments[0], _arguments[1], _arguments[2], _arguments[3], _arguments[4]);
          } catch(err) {
            if(callback) {
              callback(err);
            } else { 
              Log.error("Error on handling UI element event", err);
            }
          }
        } else {
          const err = "Can't find method <" + event.procedure + ">.";
          if(callback) {
            callback(err);
          } else { 
            return Log.error(err);
          }
        }
      } else {
        // missing handler is not an error
      }
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
          const application = Platform.applications[msg.appID];
          if(!application) {
            return;
          }
          //UIEventController.IncomingCall(msg);
        } catch(e) {
          console.log(e);
        }
    });



  });
  
  return io;
}

module.exports.listen = listen;