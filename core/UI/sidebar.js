/* globals Tools UIElement */

UIElement.add = function(value, callback) {

    const mainFunction = function(callback) {
      const message = {
        directive: "add",
        elementId: UIElement.config.id,
        arguments: [value]
      }
      
      Application.window.directiveToClient("directive", message, function(err) {
        if(err) {
            callback(err);
        } else {
            callback(null);
        }
      })
  }
  
  if(callback) {
      return mainFunction(callback);
  }

  return new Promise(function(resolve, reject) {
      mainFunction(function(error, result) {
          error ? reject(error) : resolve(result);
      });
  });
}