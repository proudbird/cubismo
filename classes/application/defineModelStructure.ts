import MetaDataObject from '../../classes/MetaDataObject'
import path from 'path'
import ModelGenerator from '../../database/ModelGenerator'

export default async function defineModelStructure(
  cubismo, 
  application, 
  connection, 
  appModelDefinition, 
  metaDataStructure): Promise<any> {

  const modelGenerator = new ModelGenerator();
 
  modelGenerator.on("modelready", function(model, moduleFile) {

    let metaDataObject: MetaDataObject;
    let classDefinition = metaDataStructure[model.class];
    let maker = classDefinition.objectMaker;

    metaDataObject = new maker(
          cubismo,
          application,
          model.cube,
          classDefinition.type,
          model.modelName,
          path.basename(moduleFile),
          moduleFile,
          model,
          classDefinition.instanceMaker);
    application[model.cube.name][model.class].addObject(metaDataObject, moduleFile);

    if(model.collections) {
      classDefinition = metaDataStructure['Collections'];
      maker     = classDefinition.objectMaker;
      model.collections.forEach(collection => {
        metaDataObject = new maker(
              cubismo,
              application,
              model.cube,
              classDefinition,
              collection.modelName,
              undefined,
              undefined,
              collection,
              classDefinition.instanceMaker);
        
        const owner = application[model.cube.name][model.class][model.modelName];
        Object.defineProperty(owner, collection.modelName, {
          enumerable: true,
          get() {
            return metaDataObject
          }
        })
      });
    }
  });
  
  modelGenerator.once("modelStructureReady", (result) => {
    return result;
  });

  modelGenerator.define(cubismo, application, connection, appModelDefinition, metaDataStructure)
}