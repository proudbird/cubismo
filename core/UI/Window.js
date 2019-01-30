/* globals Form UIElement */

UIElement.NewWindow = function(URL) {
    var Message = {};
    Message.Directive = 'NewWindow';
    Message.URL       = URL;
    Form.Client.emit('message', Message);
}