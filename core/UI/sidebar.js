/* globals Tools UIElement */

UIElement.add = function(value, callback) {
    
  const message = {
      directive: "sidabar.add",
      viewId   : UIElement.config.id,
      value    : value
    }
    
    Application.window().client.emit('message', message, function(err) {
      if(callback) {
        callback(err);
      } else {
        Log.error("Unsuccessful attempt to add item to sidebar", err);
      }
    });
}