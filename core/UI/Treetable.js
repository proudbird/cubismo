/* globals Tools SEQUELIZE QO Platform Form UIElement */

const _ = require('lodash');

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

UIElement.Refresh = function(callback) {
    var Message = {};
    Message.Directive = 'Refresh';
    Message.ViewID    = UIElement.View.id;
    Form.Client.emit('message', Message, function(Response) {
      if(callback) callback(Response);
    });
}

UIElement.GetSelectedItems = function(callback) {
    var Message = {};
    Message.Directive = 'GetSelectedItems';
    Message.ViewID    = UIElement.View.id;
    Form.Client.emit('message', Message, function(Response) {
      var dataSchema  = UIElement.View.dataSchema;
      var Data        = Response.Value;
      var Application = Platform.Applications[Response.AppID];
      
      var Selectors = [];
      for(var i = 0; i < Data.length; i++) {
        Selectors.push(Data[i].id);
      }
      
      const mainObject = dataSchema.mainObject;
      const modelName  = Application.ApplicationTypes[mainObject.type].Prefix + mainObject.cube + '_' + mainObject.model;
      const model      = Application.DBConnection.models[modelName];
      
      let queryOptions = _.cloneDeep(UIElement.View.dataSchema.queryOptions);
      if(!queryOptions) {
        queryOptions = {};
        queryOptions.where = {};
      }
      if(!queryOptions.where) {
        queryOptions.where = {};
      }
      delete queryOptions.where.ParentId;
      queryOptions.where.id = {[QO.in]: Selectors };
      
      model
        .Select(queryOptions)
          .then(Result => {
            callback(Result);
        });
    });
}

UIElement.SetFilter = function(filters, callback) {
    let queryOptions = UIElement.View.dataSchema.queryOptions;
    if(!queryOptions) {
      queryOptions = {};
      queryOptions.where = {};
    }
    if(!queryOptions.where) {
      queryOptions.where = {};
    }
    
    filters.forEach(function(item, i, filters) {
      queryOptions.where[item.attribute] = item.value;
    });
    
    UIElement.Refresh();
}

UIElement.Search = function(filters, callback) {
    let queryOptions = UIElement.View.dataSchema.queryOptions;
    if(!queryOptions) {
      queryOptions = {};
      queryOptions.where = {};
    }
    if(!queryOptions.where) {
      queryOptions.where = {};
    }
    
    filters.forEach(function(item, i, filters) {
      queryOptions.where[item.attribute] = item.value;
    });
    
    UIElement.Refresh();
}

UIElement.defineContextMenu = function(itemId, config, callback) {
  
  var menu = {
    view: "ContextMenu",
    formID: UIElement.View.formID,
    id: UIElement.View.formID + "_context",
    data: config
  };

  var Message = {};
  Message.Directive = 'defineContextMenu';
  Message.ViewID    = UIElement.View.id;
  Message.item     = itemId;
  Message.Value     = menu;
  Form.Client.emit('message', Message, function(Response) {
    if(callback) callback(Response);
  });
}