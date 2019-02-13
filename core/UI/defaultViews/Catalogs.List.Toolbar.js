async function create(_arguments) {
  _arguments.type.new().show();
}

async function edit(_arguments) {
  const selected = await _arguments.view.List.getSelected();
  const item = selected[0];
  item.show();
}

function defineCommand(command, _arguments) {
  switch (command) {
    case "DefaultCmd.Create":
      _arguments.uiElement[command] = function () {
        create(_arguments);
      };
      break;
    case "DefaultCmd.Edit":
      _arguments.uiElement[command] = function () {
        edit(_arguments);
      };
      break;
  }
}
module.exports.defineCommand = defineCommand;