/* globals Form UIElement */

UIElement.ClearAll = function(callback) {
    var message = {};
    message.Directive = 'ClearAll';
    message.ViewID    = UIElement.View.id;
    Form.Client.emit('message', message, function(response) {
      callback(response);
    });
}

UIElement.Add = function(item, index, parentId, callback) {
    var message = {};
    message.Directive = 'TreeAdd';
    message.viewID    = UIElement.View.id;
    message.item      = item;
    message.index     = index;
    message.parentId  = parentId;
    Form.Client.emit('message', message, function(response) {
      callback(response);
    });
}

UIElement.Select = function(itemId, callback) {
    var message = {};
    message.Directive = 'TreeSelect';
    message.viewID    = UIElement.View.id;
    message.itemId    = itemId;
    Form.Client.emit('message', message, function(response) {
      callback(response);
    });
}

UIElement.GetItems = function(PropertiesFilter, callback) {
    var message = {};
    message.Directive        = 'GetItems';
    message.ViewID           = UIElement.View.id;
    message.PropertiesFilter = PropertiesFilter;
    Form.Client.emit('message', message, function(response) {
      callback(response);
    });
}
