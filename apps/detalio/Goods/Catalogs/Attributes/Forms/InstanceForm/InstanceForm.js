/* globals Form System Platform Application Tools Cube Master*/

var async = require("async");

Form.OnLoad = function() {
  
}

Form.Ok = function() {
  Form.Save();
  Form.Close();
}

Form.Add = function() {
  Form.Values.Add();
}

Form.Remove = function() {
  Form.Values.GetSelectedItems(function(SelectedItems) {
    if(SelectedItems) {
      Form.Values.Remove(SelectedItems);
    }
  });
}