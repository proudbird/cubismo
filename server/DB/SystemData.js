"use strict";

const sequelize = require("sequelize");

const sysTables = {
  SY_Nummirators: {
    config: {
      timestamps: false,
      freezeTableName: true
    },
    attributes: {
      id: {
        type: sequelize.UUID,
        defaultValue: sequelize.UUIDV4,
        primaryKey: true,
        unique: true
      },
      reference: {
        type: sequelize.STRING(11),
      },
      period: {
        type: sequelize.DATE,
        defaultValue: null
      },
      parent: {
        type: sequelize.UUID,
        defaultValue: null,
      },
      number: {
        type: sequelize.STRING(25),
        defaultValue: null,
      }
    }
  }
};

function define(db) {

  for(let tableName in sysTables) {
    const table = sysTables[tableName];
    db.define(tableName, table.attributes, table.config);
  }
}

module.exports.define = define;