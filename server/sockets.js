var UIEventController = require("./UIEventController");
const Query = require("./Query");

function init(platform, server) {
  var socketio = require("socket.io");
  var io = {};

  const applications = [];

  const args = process.argv;
  if(args && args.length > 2) {
    for(let i=2; i<args.length; i++) {
      const appId = args[i];
      const application = platform.applications[appId];
      if(!application) {
        platform.initApplication(appId)
        .then(app => {
          applications.push(app);
        });
      }
    }
  }

  io = socketio.listen(server);

  io.on('connection', function (socket) {

    const applicationId = socket.handshake.query.applicationId;

    Log.debug(`Client for application <${applicationId}> is connected`);

    if(applicationId === "index") {
      // sumbody is knoking, so let wait
    } else {
      const application = platform.applications[applicationId];
      applications.push(application);
      if(!application) {
        return Log.error(`Application <${applicationId}> is not defined`);
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
    }

    socket.on('error', function (Err) {
      console.log('socket.io gave error = > ' + Err);
    });
    
    socket.on('disconnect', function () {
      //sockets.splice(sockets.indexOf(socket), 1);
    });

    socket.on("index", (message, callback) => {
      if(!message.clientId) {
        return;
      }
      applications.forEach(app => {
        const subscriber = _.get(app, "_.clientSubscribers." + message.clientId);
        if(subscriber) {
          subscriber.connect(socket);
        }
      });
    });

    socket.on('getData', function (message, callback) {
      process.env.WINDOW = message.windowId;
      process.env.LANG   = message.lang;

      const application = getApplication(message);
      const view        = getView(message, application);
      const uiElement   = getUIElement(message, view);

      const queryString = uiElement.config.query;
      const map = uiElement.config.query.map;
      application.Query.execute(queryString, undefined, uiElement)
      .then(result => {
        const data = _.makeHierarchical(result[0], "parentId", "data", map);
        callback(null, data);
      })
      .catch(err => {
        callback(err)
      })
    });

    socket.on('localaze', function (message, callback) {
      process.env.WINDOW = message.windowId;
      process.env.LANG   = message.lang;

      const application = getApplication(message);
      const view        = getView(message, application);
      const uiElement   = getUIElement(message, view);
      let item          = view.item;

      if(message.collection) {
        const collection = _.get(view, message.collection);
        item = collection[message.index]
      }

      const translations = message.translations;
      if(translations && translations.length) {
        translations.forEach(translation => {
          const newValue = { value: translation.value, itWasChangerdOnClient: true };
          item.setValue(translation.attribute, newValue, translation.lang);
          //item.setValue(translation.attribute, translation.value, translation.lang);
        })
      }
    });

    socket.on('getLocal', function (message, callback) {
      process.env.WINDOW = message.windowId;
      process.env.LANG   = message.lang;

      const application = getApplication(message);
      const view        = getView(message, application);
      let item          = view.item;

      if(message.collection) {
        const collection = _.get(view, message.collection);
        item = collection[message.index]
      }
    
      callback(null, item.getValue(message.attribute, message.lang));
    });

    socket.on('lookup', async function (message, callback) {
      process.env.WINDOW = message.windowId;
      process.env.LANG   = message.lang;

      const application = getApplication(message);
      const view = getView(message, application);
      const uiElement = getUIElement(message, view);
      let instance = message.arguments[0];

      

      let onlyFolders = uiElement.config.onlyFolders;
      const action = message.action;
      let directive = "setValue";

      function _setValue(value) {
        const propertyName = uiElement.config.dataLink.replace("item.", "");
        const newValue = { value: value, itWasChangerdOnClient: true };
        //view.item.setValue(propertyName, newValue);
        uiElement.value = newValue;
        if(!uiElement.config.events) {
          return;
        }
        const procedure = uiElement.config.events["onChange"];
        if(procedure) {
          const eventHandler = view[procedure];
          if(eventHandler) {
            try {
              view[procedure](value);
            } catch(err) {
                Log.error("Error on handling UI element event", err);
            }
          } else {
            const err = "Can't find method <onChange>.";
            if(callback) {
              callback(err);
            } else { 
              return Log.error(err);
            }
          }
        } else {
          // missing handler is not an error
        }
      }

      if(message.collection) {
        directive = "updateItem";
        var target = _.get(view, uiElement.config.dataLink);
        if(target && target.length) {
          item = target[message.index];
          item.view = view;
          instance = message.arguments[0];
          onlyFolders = false;
          //_setItemValue(item, value);
          //return;
        } else {
          Log.error("Collection <" + uiElement.config.dataLink + "> doesn't have rows!");
        }

        if(_.has(uiElement, "config.events.onLookup")) {
          const procedure = uiElement.config.events["onLookup"];
          if(procedure) {
            const eventHandler = view[procedure];
            if(eventHandler) {
              try {
                view[procedure]({
                  element: uiElement,
                  item: item,
                  attribute: message.property
                });
              } catch(err) {
                  Log.error("Error on handling UI element event", err.stack);
              }
            } else {
              const err = "Can't find method <onLookup>.";
              if(callback) {
                callback(err);
              } else { 
                return Log.error(err);
              }
            }
          } else {
            // missing handler is not an error
          }
          return;
        }
      }

      if(action === "clear") {
        _setValue(null);
        //uiElement.value = null;
        return;
      } 

      options = {
        purpose: "select",
        caller: view,
        onlyFolders: onlyFolders
      }
      const type = _.getPropertyByTrack(application, instance.model);
      if(type._.model.definition.owners && type._.model.definition.owners.length) {
        options.owner = item;
      }

      type.show({options})
        .then(value => {
          let _arguments;
          if(directive === "updateItem") {
            item[message.property] = value;
            _arguments = [message.itemId, item.toJSON() ]
          } else {
            const newValue = { 
              id: value.getValue("id"),
              presentation: value.getValue("Name"),
              model: value._.model.name
            }
            _arguments = [newValue]
          }
          const _message = {
            directive: directive,
            elementId: uiElement.config.id,
            itemId: message.itemId,
            arguments: _arguments
          }
          socket.emit("directive", _message, function(response) {
            if (response.err) {
              Log.error("Unsuccessable atempt to change value of " + uiElement.name, response.err);
            } else {
              _setValue(value);
            }
          });
        })
        .catch(err => {
          Log.error("Error on looking up for " + uiElement.name, err);
        })
    });

    function getApplication(message) {
      let application = platform.applications[message.applicationId];
      if(message.applicationId === "index" || !application && message.clientId) {
        applications.forEach(app => {
          const subscriber = _.get(app, "_.clientSubscribers." + message.clientId);
          if(subscriber) {
            application = app;
          }
        });
      }
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
      process.env.LANG   = message.lang;

      const application = getApplication(message);
      const view        = getView(message, application);
      const uiElement   = getUIElement(message, view);

      const window = application.views[process.env.WINDOW];
      window._.client = socket;

      const _arguments = message.arguments || [];
      if(uiElement[message.element]) {
        uiElement[message.element](_arguments[0], _arguments[1], _arguments[2], _arguments[3], _arguments[4]);
        return;
      }

      if(uiElement[message.event]) {
        uiElement[message.event](_arguments[0], _arguments[1], _arguments[2], _arguments[3], _arguments[4]);
        return;
      }

      if(message.event === "onLoad") {
        if(view.onLoad) {
          view.onLoad();
        }
        return;
      }

      if(message.event === "onChange") {
        const newValue = { value: _arguments[0], itWasChangerdOnClient: true };
        uiElement.value = newValue;
      }

      if(message.event === "onItemChange") {
        var target = _.get(view, uiElement.config.dataLink);
        if(target && target.length) {
          var item = target[_arguments[1]];
          const fieldId = _arguments[0];
          item.setValue(fieldId, _arguments[3]);
        } else {
          Log.error("Collection <" + uiElement.config.dataLink + "> doesn't have rows!");
        }
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

    socket.on('onBeforeViewClose', async function (message, callback) {
      process.env.WINDOW = message.windowId;
      process.env.LANG   = message.lang;

      const application = getApplication(message);
      const view        = getView(message, application);

      let close = true;
      if(view["onBeforeViewClose"]) {
        close = await view["onBeforeViewClose"]();
      }
      view.close();
      //callback(null, close);
    });

    socket.on('beforeunload', function (message, callback) {
      process.env.WINDOW = undefined;

      const application = getApplication(message);
      if(application) {
        delete application.views[message.windowId];
      }
    });
  });
  
  return io;
}
module.exports.init = init;