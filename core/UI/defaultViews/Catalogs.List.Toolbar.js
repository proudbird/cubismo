function create(_arguments) {
  _arguments.model.new().show();

}

function defineCommand(command, _arguments) {
  switch (command) {
    case "DefaultCmd.Create":
    _arguments.uiElement[command] = function() {
        create(_arguments);
      };
      break;
  }
}
module.exports.defineCommand = defineCommand;