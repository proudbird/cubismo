/* globals Form UIElement */

UIElement.ClearAll = function(callback) {
    var Message = {};
    Message.Directive = 'ClearAll';
    Message.ViewID    = UIElement.View.id;
    Form.Client.emit('message', Message, function(Response) {
      callback(Response);
    });
}

UIElement.Add = function(Value, callback) {
    var Message = {};
    Message.Directive = 'Add';
    Message.ViewID    = UIElement.View.id;
    Message.Value     = Value;
    Form.Client.emit('message', Message, function(Response) {
      callback(Response);
    });
}

UIElement.GetItems = function(PropertiesFilter, callback) {
    var Message = {};
    Message.Directive        = 'GetItems';
    Message.ViewID           = UIElement.View.id;
    Message.PropertiesFilter = PropertiesFilter;
    Form.Client.emit('message', Message, function(Response) {
      callback(Response);
    });
}

UIElement.setStyle = function(property, Value, id) {
  var Message = {};
  Message.Directive = 'setStyle';
  Message.ViewID    = UIElement.View.id;
  Message.property  = property;
  Message.Value     = Value;
  Message.itemId    = id;
  Form.Client.emit('message', Message, function(error) {
    if(error) {
      log("Unsucsesful atempt ot set element style for " + UIElement.Name, error);
    }
  });
}