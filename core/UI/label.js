/* globals Form UIElement */

UIElement.SetLabel = function(Value) {
    var Message = {};
    Message.Directive = 'SetLabel';
    Message.ViewID    = UIElement.View.id;
    Message.Value     = Value;
    Form.Client.emit('message', Message);
}

UIElement.setCSS = function(Value) {
  var Message = {};
  Message.Directive = 'setCSS';
  Message.ViewID    = UIElement.View.id;
  Message.Value     = Value;
  Form.Client.emit('message', Message);
}

UIElement.setStyle = function(property, Value) {
  var Message = {};
  Message.Directive = 'setStyle';
  Message.ViewID    = UIElement.View.id;
  Message.property  = property;
  Message.Value     = Value;
  Form.Client.emit('message', Message, function(error) {
    if(error) {
      log("Unsucsesful atempt ot set element style for " + UIElement.Name, error);
    }
  });
}