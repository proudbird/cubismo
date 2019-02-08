/* globals $$ */
let reconection;
const server = io({
  query: {
    applicationId: window.applicationId
  }
});

function reconnect() {
  if(!server.connected) {
    server.connect({
      query: {
        applicationId: window.applicationId
      }
    });
  } else {
    clearInterval(reconection);
  }
}

server.on('connect', function () {});

server.on('disconnect', function () {
  reconection = setInterval(reconnect, 1000);
 });

server.on("window", function (config) {
  webix.ui(
    JSON.parse(config, function(key, value) {
      if (typeof value === "string" &&
          value.startsWith("/Function(") &&
          value.endsWith(")/")) {
        value = value.substring(10, value.length - 2);
        return eval("(" + value + ")");
      }
      return value;
      }
    )
  );
});

server.on("directive", function (message, callback) {
  const elementId = message.elementId;
  const element = $$(elementId);
  if(!element) {
    callback("No such element with ID <" + elementId + ">");
  }
  const method = element[message.directive];
  if(!method) {
    callback("No such method <" + message.directive + "> for element with ID <" + elementId + ">");
  }
  const _arguments = message.arguments || [];
  method(_arguments[0], _arguments[1], _arguments[2], _arguments[3], _arguments[4]);
})

function eventToServer(action) {
  action.applicationId = window.applicationId;
  action.windowId      = window.windowId;
  server.emit('event', action, function(err) {
    // @TODO something if error 
  });   
}