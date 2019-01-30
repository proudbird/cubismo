/* globals __ROOT Tools Platform DBTypes*/
'use strict';

const EventEmitter = require('events');

class Generator extends EventEmitter {}
const generator = new Generator();

generator.define = function(application, db, appModelDefinition) {
  
  const self = this;

  function attributeSetter(instance, attributeName, value) {
    if (typeof value == "object" && value && value.itWasChangerdOnClient) {
      instance.setDataValue(attributeName, value.value);
    }
    else {
      instance.setDataValue(attributeName, value);
      if (instance.Form) {
        const form = instance.Form;
        form.Client.emit('message', {
          directive: 'masterChanged',
          viewId: form[attributeName].View.id,
          value: value,
        });
      }
    }
  }

  function defineAttributeOprions(model, attributes) {

    const belongsTo = [];

    for (let attributeName in model.attributes) {
      const attribute = model.attributes[attributeName];
      const type = attribute.type;
      let dataType = undefined;
      switch (type.dataType) {
        case "STRING":
          // attribute type is STRING
          if (type.length > 0) {
            dataType = DBTypes.STRING(type.length);
          }
          else {
            dataType = DBTypes.TEXT;
          };
          if (Array.isArray(type.lang) && type.lang.length > 0) {
            for (let i = 0; i < type.lang.length; i++) {
              const lang = type.lang[i];
              attributes[attributeName + "_" + lang] = {
                type: dataType,
                field: attribute.fieldId + "_" + lang,
                set(value) {
                  attributeSetter(this, attributeName, value);
                }
              }
            }
          }
          else {
            attributes[attributeName] = {
              type: dataType,
              field: attribute.fieldId,
              set(value) {
                attributeSetter(this, attributeName, value);
              }
            }
          };
          break;
        case "NUMBER":
          // attribute type is NUMBER
          if (type.fractionLength > 0) {
            dataType = DBTypes.DECIMAL(type.length, type.fractionLength);
          }
          else {
            dataType = DBTypes.FLOAT(type.length);
          };
          attributes[attributeName] = {
            type: dataType,
            field: attribute.fieldId,
            set(value) {
              attributeSetter(this, attributeName, value);
            }
          };
          break;
        case "BOOLEAN":
          // attribute type is BOOLEAN      
          attributes[attributeName] = {
            type: DBTypes.BOOLEAN,
            field: attribute.fieldId,
            set(value) {
              attributeSetter(this, attributeName, value);
            }
          };
          break;
        case "DATE":
          // attribute type is DATE      
          if (type.dateType === "date") {
            dataType = DBTypes.DATEONLY;
          }
          else {
            // date and time
            dataType = DBTypes.DATE;
          };
          attributes[attributeName] = {
            type: dataType,
            field: attribute.fieldId,
            set(value) {
              attributeSetter(this, attributeName, value);
            }
          };
          break;
        case "FK":
          // attribute type is Forein key - link to another model
          const fkId = type.reference.modelId;
          const refference = defineModel(appModelDefinition[fkId].definition);
          // attributes[attributeName] = {
          //   type: DBTypes.UUID,
          //   field: attribute.fieldId,
          //   set(value) {
          //     attributeSetter(this, attributeName, value);
          //   },
          //   references: {
          //     model: refference,
          //     key: 'id',
          //     deferrable: DBTypes.Deferrable.NOT
          //   }
          // };

          belongsTo.push({ to: refference, as: attributeName, foreignKey: attribute.fieldId });
      }
    }

    return { attributes: attributes, belongsTo: belongsTo };
  }

  function defineCatalogAttributes(model) {

    const belongsTo = [];

    const attributes = {
      // field 'id' and 'droped' are must be
      id: {
        type: DBTypes.UUID,
        defaultValue: DBTypes.UUIDV4,
        primaryKey: true,
        unique: true
      },
      droped: {
        type: DBTypes.BOOLEAN,
        defaultValue: false
      }
    };

    // in case of multilevel type 'forlders' or 'foldersAndItems' adding field isFolder
    if (model.multilevel && model.multilevelType != "items") {
      attributes.isFolder = {
        type: DBTypes.BOOLEAN,
        defaultValue: false
      }
    }

    // catalog may be without property Code
    if (model.codeLenght > 0) {
      attributes.Code = {
        type: model.codeType == "INTEGER" ? DBTypes.INTEGER : DBTypes.STRING(model.codeLenght),
        autoIncrement: false, //model.autoIncrement,
        unique: model.uniqueCode
      }
    }

    // catalog may be without property Name
    if (model.nameLenght > 0) {
      // 'Name' can be in diffrent languges
      if (Array.isArray(model.nameLang) && model.nameLang.length > 0) {
        for (let i = 0; i < model.nameLang.length; i++) {
          const lang = model.nameLang[i];
          attributes["Name_" + lang] = {
            type: DBTypes.STRING(model.nameLenght)
          }
        }
      }
      else {
        attributes.Name = {
          type: DBTypes.STRING(model.nameLenght)
        }
      }
    }

    const attributeOptions = defineAttributeOprions(model, attributes);

    return { attributes: attributeOptions.attributes, belongsTo: attributeOptions.belongsTo };
  }

  function defineRecorderAttributes(model) {

    const attributes = {
      // field 'id', 'droped' and 'Date' are must be
      id: {
        type: DBTypes.UUID,
        defaultValue: DBTypes.UUIDV4,
        primaryKey: true,
        unique: true
      },
      droped: {
        type: DBTypes.BOOLEAN,
        defaultValue: false
      },
      booked: {
        type: DBTypes.BOOLEAN,
        defaultValue: false
      },
      Date: {
        type: DBTypes.DATE,
        defaultValue: DBTypes.NOW
      }
    };

    const belongsTo = [];

    const attributeOptions = defineAttributeOprions(model, attributes, belongsTo);

    return { attributes: attributes, belongsTo: attributeOptions.belongsTo };
  }
  
  function defineCollectionAttributes(model) {

    const attributes = {
      // field 'id', 'droped' and 'Date' are must be
      id: {
        type: DBTypes.UUID,
        defaultValue: DBTypes.UUIDV4,
        primaryKey: true,
        unique: true
      },
      order: {
        type: DBTypes.INTEGER
      }
    };

    const belongsTo = [];

    const attributeOptions = defineAttributeOprions(model, attributes, belongsTo);

    return { attributes: attributes, belongsTo: attributeOptions.belongsTo };
  }

  function defineModel(model) {
    
    // check if the model is already defined, just return it from the list
    let modelName;
    if (model.class === "Collection") {
      modelName = model.ownerModelName + model.name;
    } else {
      modelName = model.cube + model.class + model.name;
    }
    if (db.models[modelName]) {
      return db.models[modelName];
    }

    let attributeOptions = {};
    // didn't find the model - so, let's build it!
    switch (model.class) {
      case "Catalogs":
        attributeOptions = defineCatalogAttributes(model);
        break;
      case "Recorders":
        attributeOptions = defineRecorderAttributes(model);
      case "Collection":
        attributeOptions = defineCollectionAttributes(model);
    }

    const config = {
      timestamps: model.class === "Collection" ? false: true,
      paranoid: true,
      freezeTableName: true,
      tableName: model.tableId,
    };

    const _model = db.define(modelName, attributeOptions.attributes, config);
    _model.modelName = model.name;
    _model.cube = application.Cubes[model.cube];
    _model.class = model.class;
    _model.owners = [];
    _model.definition = model;

    if (Array.isArray(attributeOptions.belongsTo) && attributeOptions.belongsTo.length) {
      for (let i = 0; i < attributeOptions.belongsTo.length; i++) {
        const _belongs = attributeOptions.belongsTo[i];
        _model.belongsTo(_belongs.to, { as: _belongs.as, foreignKey: _belongs.foreignKey, constraints: false });
      }
    }

    // if catalog is multilevel, adding field 'parentId'
    if (model.multilevel) {
      _model.belongsTo(_model, { as: "Parent", foreignKey: "parentId", constraints: false });
    }

    if (Array.isArray(model.owners) && model.owners.length) {
      for (let i = 0; i < model.owners.length; i++) {
        const ownerId = model.owners[i];
        const _owner = defineModel(appModelDefinition[ownerId].definition);
        _model.belongsTo(_owner, { as: "Owner", foreignKey: "ownerId", constraints: false });

      }
    }
    
    if (model.collections && typeof model.collections === "object") {
      attributeOptions = {};
      for(let id in model.collections) {
        const colModel = model.collections[id];
        colModel.ownerModelName = modelName;
        const _collection = defineModel(colModel);
        _model.hasMany(_collection, { as: "Owner", foreignKey: "ownerId", constraints: false });
        if (Array.isArray(attributeOptions.belongsTo) && attributeOptions.belongsTo.length) {
          for (let i = 0; i < attributeOptions.belongsTo.length; i++) {
            const _belongs = attributeOptions.belongsTo[i];
            _model.belongsTo(_belongs.to, { as: _belongs.as, foreignKey: _belongs.foreignKey, constraints: false });
          }
        }
      }
    }
    
    return _model;
  }

  for (let appModelId in appModelDefinition) {
    const modelDefinition = appModelDefinition[appModelId].definition;
    const model = defineModel(modelDefinition);
    generator.emit("modelready", model, appModelDefinition[appModelId].module);
  }
}
module.exports = generator;