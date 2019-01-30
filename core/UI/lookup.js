/* globals Tools SEQUELIZE QO Platform Form UIElement */

const _ = require('lodash');

UIElement.updateItem = function(target, value, callback) {
  var message = {};
  message.directive = 'updateInstance';
  message.target    = { id: UIElement.View.id };
  message.value     = { id: value.id, name: value.Name };
  Form.Client.emit('message', message, function(response) {
    if(callback) callback(response);
  });
}