/* globals Tools SEQUELIZE QO Platform Form UIElement */

const _ = require('lodash');

UIElement.ClearAll = function (callback) {
  var message = {};
  message.Directive = 'ClearAll';
  message.ViewID = UIElement.View.id;
  Form.Client.emit('message', message, function (response) {
    callback(response);
  });
}

UIElement.Add = function (item, index, parentId, callback) {
  var message = {};
  message.Directive = 'TreeAdd';
  message.viewID = UIElement.View.id;
  message.item = item;
  message.index = index;
  message.parentId = parentId;
  Form.Client.emit('message', message, function (response) {
    callback(response);
  });
}

UIElement.Select = function (itemId, callback) {
  var message = {};
  message.Directive = 'TreeSelect';
  message.viewID = UIElement.View.id;
  message.itemId = itemId;
  Form.Client.emit('message', message, function (response) {
    callback(response);
  });
}

UIElement.Refresh = function (callback) {
  var Message = {};
  Message.Directive = 'Refresh';
  Message.ViewID = UIElement.View.id;
  Form.Client.emit('message', Message, function (Response) {
    if (callback) callback(Response);
  });
}

// UIElement.getSelected = function (callback) {

//   const mainFunction = function (callback) {

//     const message = {
//       directive: "getSelectedItem",
//       elementId: UIElement.config.id,
//       arguments: [true]
//     }

//     Application.window.directiveToClient("directive", message, function (response) {
//       if (response.err) {
//         callback(response.err);
//       } else {
//         const selectors = _.map(response.result, 'id');
//         _getItems(UIElement, selectors)
//           .then(result => {
//             callback(null, result);
//           })
//           .catch(err => {
//             Log.error(err);
//           })
//       }
//     })
//   }

//   if (callback) {
//     return mainFunction(callback);
//   }

//   return new Promise(function (resolve, reject) {
//     mainFunction(function (error, result) {
//       error ? reject(error) : resolve(result);
//     });
//   });

// }

UIElement.update = async function (item, directive) {

  return new Promise(function (resolve, reject) {
    const message = {
      directive: directive,
      elementId: UIElement.config.id,
      arguments: [item.toJSON()]
    }

    Application.window.directiveToClient("dataUpdate", message, async function (response) {
      if (response.err) {
        reject(response.err);
      } else {
        resolve(response.result);
      }
    })
  });
}

UIElement.getSelected = async function () {

  return new Promise(function (resolve, reject) {
    const message = {
      directive: "getSelectedItem",
      elementId: UIElement.config.id,
      arguments: [true]
    }

    Application.window.directiveToClient("directive", message, async function (response) {
      if (response.err) {
        reject(error);
      } else {
        const selectors = _.map(response.result, 'id');
        resolve(await _getItems(UIElement, selectors))
      }
    })
  });
}

UIElement.openAll = async function () {

  return new Promise(function (resolve, reject) {
    const message = {
      directive: "openAll",
      elementId: UIElement.config.id,
      arguments: []
    }

    Application.window.directiveToClient("directive", message, async function (response) {
      if (response.err) {
        reject(error);
      } else {
        resolve(null)
      }
    })
  });
}

// function _getItems(view, selectors) {

//   const from = _.cloneDeep(view.config.query.FROM);
//   const options = {
//     where: {
//       id: {
//         [QO.in]: selectors
//       }
//     }
//   };

//   const type = Tools.getPropertyByTrack(Application, from);

//   const mainFunction = function (callback) {
//     type.select(options)
//       .then(result => {
//         callback(null, result);
//       })
//       .catch(err => {
//         callback(err)
//       })
//   }

//   return new Promise(function (resolve, reject) {
//     mainFunction(function (error, result) {
//       error ? reject(error) : resolve(result);
//     });
//   });
// }

async function _getItems(view, selectors) {

  const from = _.cloneDeep(view.config.query.FROM);
  const options = {
    where: {
      id: {
        [QO.in]: selectors
      }
    }
  };

  const type = Tools.getPropertyByTrack(Application, from);
  return await type.select(options);
}

UIElement.SetFilter = function (filters, callback) {
  let queryOptions = UIElement.View.dataSchema.queryOptions;
  if (!queryOptions) {
    queryOptions = {};
    queryOptions.where = {};
  }
  if (!queryOptions.where) {
    queryOptions.where = {};
  }

  filters.forEach(function (item, i, filters) {
    queryOptions.where[item.attribute] = item.value;
  });

  UIElement.Refresh();
}

UIElement.Search = function (filters, callback) {
  let queryOptions = UIElement.View.dataSchema.queryOptions;
  if (!queryOptions) {
    queryOptions = {};
    queryOptions.where = {};
  }
  if (!queryOptions.where) {
    queryOptions.where = {};
  }

  filters.forEach(function (item, i, filters) {
    queryOptions.where[item.attribute] = item.value;
  });

  UIElement.Refresh();
}

UIElement.defineContextMenu = function (itemId, config, callback) {

  var menu = {
    view: "ContextMenu",
    formID: UIElement.View.formID,
    id: UIElement.View.formID + "_context",
    data: config
  };

  var Message = {};
  Message.Directive = 'defineContextMenu';
  Message.ViewID = UIElement.View.id;
  Message.item = itemId;
  Message.Value = menu;
  Form.Client.emit('message', Message, function (Response) {
    if (callback) callback(Response);
  });
}