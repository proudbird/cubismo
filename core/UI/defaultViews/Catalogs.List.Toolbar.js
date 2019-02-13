async function create(_arguments) {
  _arguments.type.new().show();
}

async function edit(_arguments) {
  const selected = await _arguments.view.List.getSelected();
  const item = selected[0];
  item.show();
}

async function remove(_arguments, immediate) {
  const selected = await _arguments.view.List.getSelected();
  selected.forEach(async (item) => {
    await item.delete(immediate);
  });
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
    case "DefaultCmd.Delete":
      _arguments.uiElement[command] = function () {
        remove(_arguments);
      };
      break;
      case "DefaultCmd.Remove":
      _arguments.uiElement[command] = function () {
        remove(_arguments, true);
      };
      break;
  }
}
module.exports.defineCommand = defineCommand;