import EventEmitter from 'events'
import { Sequelize, DataTypes } from 'sequelize'
import { AttributeOptions, CatalogAtrributes, ConstantAtrributes, RegistratorAtrributes } from './types'
import { MetaDataTypes } from '../common/Types'

export default class ModelGenerator extends EventEmitter {



  define(cubismo, application, connection: Sequelize, appModelDefinition, metaDataStructure): void {

    const self = this
  
    function attributeSetter(instance, attributeName, value) {
      if (typeof value == "object" && value && value.itWasChangerdOnClient) {
        instance.setDataValue(attributeName, value.value)
      }
      else {
        instance.setDataValue(attributeName, value)
        if (instance.Form) {
          const form = instance.Form
          form.Client.emit('message', {
            directive : 'masterChanged',
            viewId    : form[attributeName].View.id,
            value     : value,
          })
        }
      }
    }

    function defineAttributeOptions(model, attributes) {

      const belongsTo = []

      for (let attributeName in model.attributes) {
        const attribute = model.attributes[attributeName]
        const type      = attribute.type
        let dataType    = undefined
        //let attributeId = attribute.fieldId
        switch (type.dataType) {
          case "STRING":
            // attribute type is STRING
            if (type.length > 0) {
              dataType = DataTypes.STRING(type.length)
            }
            else {
              dataType = DataTypes.TEXT
            }
            //let attributeId = attribute.fieldId
            if (Array.isArray(type.lang) && type.lang.length > 0) {
              //let attributeId = attribute.fieldId
              for (let i = 0; i < type.lang.length; i++) {
                const lang = type.lang[i]
                const attributeId = attribute.fieldId + "_" + lang
                attributes[attributeId] = {
                  type : dataType,
                  field: attributeId,
                  set(value) {
                    attributeSetter(this, attributeId, value)
                  }
                }
              }
            }  else {
              //let attributeId = attribute.fieldId
              attributes[attribute.fieldId] = {
                type        : dataType,
                defaultValue: type.defaultValue,
                field       : attribute.fieldId,
                set(value) {
                  attributeSetter(this, attribute.fieldId, value)
                }
              }
            }
            break
          case "NUMBER":
            // attribute type is NUMBER
            if (type.scale > 0) {
              dataType = DataTypes.DECIMAL(type.length, type.scale)
            }
            else {
              dataType = DataTypes.FLOAT(type.length)
            }
            //let attributeId = attribute.fieldId
            attributes[attribute.fieldId] = {
              type        : dataType,
              defaultValue: type.defaultValue,
              field       : attribute.fieldId,
              set(value) {
                attributeSetter(this, attribute.fieldId, value)
              }
            }
            break
          case "BOOLEAN":
            // attribute type is BOOLEAN   
            //let attributeId = attribute.fieldId
            attributes[attribute.fieldId] = {
              type        : DataTypes.BOOLEAN,
              defaultValue: type.defaultValue,
              field       : attribute.fieldId,
              set(value) {
                attributeSetter(this, attribute.fieldId, value)
              }
            }
            break
          case "DATE":
            // attribute type is DATE      
            if (type.dateType === "date") {
              dataType = DataTypes.DATEONLY
            }
            else {
              // date and time
              dataType = DataTypes.DATE
            }
            //let attributeId = attribute.fieldId
            attributes[attribute.fieldId] = {
              type : dataType,
              field: attribute.fieldId,
              set(value) {
                attributeSetter(this, attribute.fieldId, value)
              }
            }
            break
          case "ENUM":
              // attribute type is ENUM   
              //let attributeId = attribute.fieldId
              attributes[attribute.fieldId] = {
                type        : DataTypes.UUID,
                field       : attribute.fieldId,
                set(value) {
                  attributeSetter(this, attribute.fieldId, value)
                }
              }
              break
          case "FK":
            // attribute type is Forein key - link to another model
            const fkId = type.reference.modelId
            let modelDefinition = appModelDefinition[fkId]
            let reference
            //let attributeId = attribute.fieldId
            if(modelDefinition) {
              if(type.reference.collection) {
                modelDefinition = modelDefinition.definition.collections[type.reference.collection]
                if(modelDefinition) {
                  reference = defineModel(modelDefinition)
                } else {
                  throw new Error("Can't find model definition with ID {" + type.reference.collection + "}. Attribute <" + attributeName + "> Model <" + model.name + ">")
                }
              } else {
                reference = defineModel(modelDefinition.definition)
              }
            } else {
              throw new Error("Can't find model definition with ID {" + fkId + "}. Attribute <" + attributeName + "> Model <" + model.name + ">")
            }

            belongsTo.push({ to: reference, as: attributeName, foreignKey: attribute.fieldId })
          
        }
      }

      return { attributes: attributes, belongsTo: belongsTo }
    }

    function defineConstantAttributes(model) {

      const belongsTo = []

      const attributes: ConstantAtrributes = {
        // field 'id' and 'dropped' are must be
        id: {
          type        : DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey  : true,
          unique      : true
        }
      }

      model.fieldId = `_value`;
      const data = {
        attributes: { value: model }
      }

      const attributeOptions = defineAttributeOptions(data, attributes);

      return { attributes: attributeOptions.attributes, belongsTo: attributeOptions.belongsTo }
    }

    function defineCatalogAttributes(model) {

      const belongsTo = []

      const attributes: CatalogAtrributes = {
        // field 'id' and 'dropped' are must be
        id: {
          type        : DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey  : true,
          unique      : true
        },
        dropped: {
          type        : DataTypes.BOOLEAN,
          defaultValue: false
        }
      }

      // in case of multilevel type 'forlders' or 'foldersAndItems' adding field isFolder
      if (model.multilevel) {
        if(model.multilevelType != "items") {
          attributes.isFolder = {
            type        : DataTypes.BOOLEAN,
            defaultValue: false
          }
        }
        attributes.level = {
          type        : DataTypes.INTEGER,
          defaultValue: 0
        }
      }

      // catalog may be without property Code
      if (model.codeLenght > 0) {
        attributes.Code = {
          type         : model.codeType == "INTEGER" ? DataTypes.INTEGER : DataTypes.STRING(model.codeLenght),
          autoIncrement: false, //model.autoIncrement,
          unique       : model.uniqueCode
        }
      }

      // catalog may be without property Name
      if (model.nameLenght > 0) {
        // 'Name' can be in diffrent languges
        if (Array.isArray(model.nameLang) && model.nameLang.length > 0) {
          for (let i = 0; i < model.nameLang.length; i++) {
            const lang = model.nameLang[i]
            attributes["Name_" + lang] = {
              type  : DataTypes.STRING(model.nameLenght),
              unique: model.uniqueName || false
            }
          }
        }
        else {
          attributes.Name = {
            type  : DataTypes.STRING(model.nameLenght),
            unique: model.uniqueName || false
          }
        }
      }

      const attributeOptions = defineAttributeOptions(model, attributes)

      return { attributes: attributeOptions.attributes, belongsTo: attributeOptions.belongsTo }
    }

    function defineDataSetAttributes(model) {

      const belongsTo = []

      const attributes: CatalogAtrributes = {
        // field 'id' and 'dropped' are must be
        id: {
          type        : DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey  : true,
          unique      : true
        },
        dropped: {
          type        : DataTypes.BOOLEAN,
          defaultValue: false
        }
      }

      const attributeOptions = defineAttributeOptions(model, attributes)

      return { attributes: attributeOptions.attributes, belongsTo: attributeOptions.belongsTo }
    }

    function defineRegistratorAttributes(model) {

      const attributes: RegistratorAtrributes = {
        // field 'id', 'dropped' and 'Date' are must be
        id: {
          type        : DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey  : true,
          unique      : true
        },
        dropped: {
          type        : DataTypes.BOOLEAN,
          defaultValue: false
        },
        booked: {
          type        : DataTypes.BOOLEAN,
          defaultValue: false
        },
        Date: {
          type        : DataTypes.DATE,
          defaultValue: DataTypes.NOW
        }
      }

      if (model.numberLenght > 0) {
        attributes.Number = {
          type         : model.numberType == "INTEGER" ? DataTypes.INTEGER : DataTypes.STRING(model.numberLenght),
          autoIncrement: false,
          unique       : model.uniqueCode
        }
      }

      const attributeOptions = defineAttributeOptions(model, attributes)

      return { attributes: attributes, belongsTo: attributeOptions.belongsTo }
    }
  
    function defineCollectionAttributes(model) {

      const attributes = {
        // field 'id', 'dropped' and 'Date' are must be
        id: {
          type        : DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey  : true,
          unique      : true
        },
        order: {
          type: DataTypes.INTEGER
        }
      }

      const attributeOptions = defineAttributeOptions(model, attributes)

      return { attributes: attributes, belongsTo: attributeOptions.belongsTo }
    }

    function defineModel(model) {
      
      // check if the model is already defined, just return it from the list
      let modelName
      if (model.class === "Collections") {
        modelName = [model.ownerModelName, model.name].join(".")
        //MetaDataTypes.storeTypeById(model.ownerModel.id, modelName);
      } else {
        modelName = [model.cube, model.class, model.name].join(".")
        MetaDataTypes.storeTypeById(model.id, modelName);
      }
      if (connection.models[modelName]) {
        return connection.models[modelName]
      }


      let attributeOptions: AttributeOptions = { attributes: undefined, belongsTo: undefined}
      // didn't find the model - so, let's build it!
      switch (model.class) {
        case "Constants":
          attributeOptions = defineConstantAttributes(model)
          break
        case "Catalogs":
          attributeOptions = defineCatalogAttributes(model)
          break
        case "Registrators":
          attributeOptions = defineRegistratorAttributes(model)
          break;
        case "Collections":
          attributeOptions = defineCollectionAttributes(model)
          break;
        case "DataSets":
          attributeOptions = defineDataSetAttributes(model)
          break;
      }

      const config = {
        timestamps     : model.class === "Collections" ? false : true,
        freezeTableName: true,
        tableName      : model.tableId,
        indexes        : [
          {
            fields: ['Code']
          }
        ]
      }

      const _model = connection.define(modelName, attributeOptions.attributes, config) as any
      connection.models[model.id] = _model;

      let _cube;
      if(!application[model.cube] && !model.ownerModel) {
        throw new Error(`Can't find cube '${model.cube}', setted in model ${_model.name}`);
      } else {
        _cube = application[model.cube] || model.ownerModel.cube;
      }

      _model['modelName'] = model.name;
      _model['cubismo'] = cubismo;
      _model['application'] = application;
      _model['cube'] = _cube;
      _model['class'] = model.class;
      _model['owners'] = [];
      _model['definition'] = model;
      if(model.ownerModel) {
        _model['ownerModel'] = model.ownerModel;
      }

      if (Array.isArray(attributeOptions.belongsTo) && attributeOptions.belongsTo.length) {
        for (let i = 0; i < attributeOptions.belongsTo.length; i++) {
          const _belongs = attributeOptions.belongsTo[i]
          _model.belongsTo(_belongs.to, { as: _belongs.as, foreignKey: _belongs.foreignKey, constraints: false })
        }
      }

      // if catalog is multilevel, adding field 'parentId'
      if (model.multilevel) {
        _model.belongsTo(_model, { as: "Parent", foreignKey: "parentId", constraints: false })
      }

      if (Array.isArray(model.owners) && model.owners.length) {
        for (let i = 0; i < model.owners.length; i++) {
          const ownerId = model.owners[i]
          const _owner = defineModel(appModelDefinition[ownerId].definition)
          _model.belongsTo(_owner, { as: "Owner", foreignKey: "ownerId", constraints: false })

        }
      }

      if(model.class === "Collections") {
        _model.belongsTo(model.ownerModel, { as: "Owner", foreignKey: "ownerId", constraints: false })
      }
      
      if (model.collections && typeof model.collections === "object") {
        attributeOptions = { attributes: undefined, belongsTo: undefined }
        _model.collections = [];
        for(let id in model.collections) {
          const colModel = model.collections[id]
          colModel.ownerModelName = modelName
          colModel.ownerModel = _model
          const _collection = defineModel(colModel)
          _model.hasMany(_collection, { as: colModel.name, foreignKey: "ownerId", constraints: false })
          _model.collections.push(_collection);
          if (Array.isArray(attributeOptions.belongsTo) && attributeOptions.belongsTo.length) {
            for (let i = 0; i < attributeOptions.belongsTo.length; i++) {
              const _belongs = attributeOptions.belongsTo[i]
              _model.belongsTo(_belongs.to, { as: _belongs.as, foreignKey: _belongs.foreignKey, constraints: false })
            }
          }
        }
      }

      // _model.beforeBulkCreate((records, options) => {
      //   for(let i=0; i<records.length; i++) {
      //     if(Utils.has(records[i], "_.instance")) {
      //       records[i] = records[i]._.instance
      //     }
      //   }
      //   return records
      // })
      
      return _model
    }

    for (let appModelId in appModelDefinition) {
      const modelDefinition = appModelDefinition[appModelId].definition;
      const model = defineModel(modelDefinition);
      self.emit("modelready", model, appModelDefinition[modelDefinition.id].module);
    }

    

    this.emit("modelStructureReady", true)
  }
  
}