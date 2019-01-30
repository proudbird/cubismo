'use strict';
module.exports = Query;

const _ = require('lodash');

function Query(options, model) {
  

  if (!options) {
    options = {};
  }

  this.SELECT = options.SELECT;
  this.FROM   = options.FROM;
  this.WHERE  = options.WHERE;
  this.LIMIT  = options.LIMIT;
  this.ORDER  = options.ORDER;

  this.model = model;

  this.EXECUTE = function (callback) {
    const self = this;
    const Application = Platform.Applications[process.env.Application];

    function mainFunction(callback) {
      Application.DB
        .Query(buildSQLQuery(self), self.model)
        .then(result => {
          return callback(null, result);
        })
        .catch((error) => {
          return callback(error);
        });
    }
      
    if (callback) {
      return mainFunction(callback);
    }
    
    return new Promise(function(resolve, reject) {
      mainFunction(function (error, result) {
        error ? reject(error) : resolve(result);
      });
    });
  }
}

function buildSQLQuery(query) {
  //SELECT
  var result = 'SELECT ';
  const select = query.SELECT;
  let fields = [];
  if (Array.isArray(select)) {
    for (let i = 0; i < select.length; i++) {
      const field = select[i];
      if (typeof field === 'object') {
        fields.push(buildOperation(query.FROM, field));
      } else {
        fields.push('"' + field + '"');
      }
    }
  } else {
    fields.push('*');
  }

  //FROM
  result = result + fields.join(', ');
  result += ' FROM "' + query.FROM.tableName + '" T1';

  //WHERE
  const where = query.WHERE;
  if (Array.isArray(where) && where.length > 0) {
    let newWhere = [];
    for(let i = 0; i < where.length; i++) {
      newWhere.push(buildOperation(query.FROM, where[i]));
    }
    result = result + ' WHERE ' + newWhere.join(' AND ');
  }

  //ORDER
  const order = query.ORDER;
  if (Array.isArray(order) && order.length > 0) {
    let newOrder = [];
    for(let i = 0; i < order.length; i++) {
      newOrder.push("\"" + order[i][0] + "\" " + order[i][1]);
    }
    result = result + ' ORDER BY ' + newOrder.join(', ');
  }

  //LIMIT
  const limit = query.LIMIT;
  if (limit) {
    result = result + ' LIMIT ' + limit;
  }

  //OFFSET
  const offset = query.OFFSET;
  if (offset) {
    result = result + ' OFFSET ' + offset;
  }

  return result;
}

function buildOperation(model, operation) {
  let params = operation.params;
  let param  = operation.param;
  let value  = operation.value;

  const association = model.associations[param];
  if(association) {
    param = association.identifierField;
    value = value[association.targetIdentifier];
  }

  var buildOperations = function(operations, newOperations) {
    for(let i = 0; i < operations.length; i++) {
      let operation = operations[i];
      if(operation && Array.isArray(operation)) {
        buildOperations(operation);
      }
      const association = model.associations[operation.param];
      newOperations.push(buildOperation(model, operation));
    }
  }

  if(params && Array.isArray(params)) {
    let newOperations = [];
    buildOperations(params, newOperations);
    operation.params = params = newOperations;
  } 

  switch (operation.operator) {
    case "EQ": 
      if(value === null || value === undefined) {
        return "\"" + param + "\" IS NULL";
      } else if(value === true) {
        return "\"" + param + "\" IS TRUE";
      } else if(value === false) {
        return "\"" + param + "\" IS FALSE";
      } else {
        return "\"" + param + "\" = '" + value + "'";
      }
    case "LIKE":
      return "\"" + param + "\" LIKE '" + value + "'";
    case "iLIKE":
      return "\"" + param + "\" iLIKE '" + value + "'";
    case "AND":
      return "(" + params.join(" AND ") + ")";
    case "OR":
      return "(" + params.join(" OR ") + ")";
    case "AS":
      return "\"" + param + "\" AS \"" + value + "\"";
    case "EXISTSAS":
      return "EXISTS (" + param + ") AS \"" + value + "\"";
  }
}

module.exports.Operations = {
  EQ: function(param, value) {
    return { operator: "EQ", param: param, value: value };
  },
  LIKE: function(param, value) {
    return { operator: "LIKE", param: param, value: value };
  },
  iLIKE: function(param, value) {
    return { operator: "iLIKE", param: param, value: value };
  },
  AND: function(params) {
    return { operator: "AND", params: params };
  },
  OR: function(params) {
    return { operator: "OR", params: params };
  },
  AS: function(param, value) {
    return { operator: "AS", param: param, value: value };
  },
  EXISTSAS: function(param, value) {
    return { operator: "EXISTSAS", param: param, value: value };
  }
};