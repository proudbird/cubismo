/* globals Tools Form UIElement */

UIElement.addView = function(config, callback) {

    const mainFunction = function(callback) {

      var tabview = {
        header: config.header, 
        width: 200,
        close: true,
        body: config
      }

      const message = {
        directive: "addView",
        elementId: UIElement.config.id,
        arguments: [tabview]
      }
      
      Application.window.directiveToClient("directive", message, function(err, id) {
        if(err) {
            callback(err);
        } else {
          UIElement.config.tabId = id;
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