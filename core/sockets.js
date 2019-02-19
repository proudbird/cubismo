/* globals __ROOT Tools Platform Application Form */

var UIEventController = require("./UIEventController");
const Query = require("./Query");

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

    socket.on('getData', function (message, callback) {
      const application = getApplication(message);
      const view        = getView(message, application);
      const uiElement   = getUIElement(message, view);

      const queryString = uiElement.config.query;
      application.Query.execute(queryString, undefined, uiElement)
      .then(result => {
        const data = Tools.makeHierarchical(result[0], "parentId", "data");
        callback(null, data);
      })
      .catch(err => {
        callback(err)
      })
    });

    socket.on('lookup', async function (message, callback) {
      const application = getApplication(message);
      const view = getView(message, application);
      const uiElement = getUIElement(message, view);
      const instance = message.arguments[0];
      const action = message.action;

      if(action === "clear") {
        uiElement.value = undefined;
        return;
      } 

      options = {
        purpose: "select",
        caller: view,
        onlyFolders: uiElement.config.onlyFolders
      }
      const type = Tools.getPropertyByTrack(application, instance.type);
      if(type._.model.definition.owners && type._.model.definition.owners.length) {
        options.owner = view.item;
      }
      type.show({options})
        .then(value => {
          const message = {
            directive: "setValue",
            elementId: uiElement.config.id,
            arguments: [{
              id: value.getValue("id"),
              title: value.getValue("Name"),
              type: value._.model.name
            }]
          }
          socket.emit("directive", message, function(response) {
            if (response.err) {
              Log.error("Unsuccessable atempt to change value of " + uiElement.name, response.err);
            } else {
              view.item.setValue(uiElement.config.dataLink.replace("item.", ""), value);
            }
          });
        })
        .catch(err => {
          Log.error("Error on looking up for " + uiElement.name, err);
        })
    });

    function getApplication(message) {
      const application = Platform.applications[message.applicationId];
      if(!application) {
        const err = "Application <" + message.applicationId + "> is not defined.";
        if(err) {
          return Log.error(err)
        }
      } else {
        return application;
      }
    }

    function getView(message, application) {
      const view = application.views[message.viewId];
      if(!view) {
        const err = "View with ID <" + message.viewId + "> is not defined.";
        if(err) {
          return Log.error(err)
        }
      } else {
        return view;
      }
    }

    function getUIElement(message, view) {
      let uiElement = view[message.element];
      if(message.owner) {
        if(message.owner.includes(".")) {
          const ownerPath = message.owner.split(".");
          if(ownerPath.length = 2) {
            uiElement = view[ownerPath[0]][ownerPath[1]];
          }
        } else {
          uiElement = view[message.owner];
        }
      }
      if(!uiElement) {
        const err = "UI element with name <" + message.element + "> is not defined.";
        if(err) {
          return Log.error(err)
        }
      } else {
        return uiElement;
      }
    }

    socket.on('event', function (message, callback) {
      process.env.WINDOW = message.windowId;

      const application = getApplication(message);
      const view        = getView(message, application);
      const uiElement   = getUIElement(message, view);

      const _arguments = message.arguments || [];
      if(uiElement[message.element]) {
        uiElement[message.element](_arguments[0], _arguments[1], _arguments[2], _arguments[3], _arguments[4]);
        return;
      }

      if(uiElement[message.event]) {
        uiElement[message.event](_arguments[0], _arguments[1], _arguments[2], _arguments[3], _arguments[4]);
        return;
      }

      if(message.event === "onChange") {
        uiElement.value = _arguments[0];
      }

      if(!uiElement.config.events) {
        // there is no events handlers at all
        return;
      }
      const procedure = uiElement.config.events[message.event];
      if(procedure) {
        const eventHandler = view[procedure];
        if(eventHandler) {
          try {
            view[procedure](_arguments[0], _arguments[1], _arguments[2], _arguments[3], _arguments[4]);
          } catch(err) {
            if(callback) {
              callback(err);
            } else { 
              Log.error("Error on handling UI element event", err);
            }
          }
        } else {
          const err = "Can't find method <" + message.event.procedure + ">.";
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