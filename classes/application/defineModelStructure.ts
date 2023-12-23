import MetaDataObject from '../../classes/MetaDataObject'
import path from 'path'
import ModelGenerator from '../../database/ModelGenerator'
import builtInClasses from './builtInClasses';

export default async function defineModelStructure(
  cubismo, 
  application, 
  connection, 
  appModelDefinition): Promise<any> {

  const modelGenerator = new ModelGenerator();
 
  modelGenerator.on("modelready", function(model, moduleFile) {

    let metaDataObject: MetaDataObject;
    let classDefinition = builtInClasses[model.class];
    let maker = classDefinition.objectMaker;

    if(!model.cube) {
      throw new Error(`Model is not defined`); 
    }

    const dir = path.dirname(moduleFile);
    try {
      metaDataObject = new maker({
        cubismo,
        application,
        cube: model.cube,
        type: classDefinition.objectType,
        name: model.modelName,
        filename: moduleFile,
        model,
        instanceMaker: classDefinition.instanceMaker,
      });
            
      application[model.cube.name][model.class].add({
        cubismo,
        name: model.modelName,
        type: classDefinition.objectType,
        filename: moduleFile,
        element: metaDataObject, 
      });
    } catch (error) {
      throw new Error(`Model is not defined`); 
    }

    try {
      if(model.collections) {
        classDefinition = builtInClasses['Collections'];
        maker     = classDefinition.objectMaker;
        model.collections.forEach(collection => {
          metaDataObject = new maker({
            cubismo,
            application,
            cube: model.cube,
            type: classDefinition.type,
            name: collection.modelName,
            filename: moduleFile,
            model: collection,
            instanceMaker: classDefinition.instanceMaker,
          });
          
          const owner = application[model.cube.name][model.class][model.modelName];
          Object.defineProperty(owner, collection.modelName, {
            enumerable: true,
            get() {
              return metaDataObject
            }
          })
        });
      }
    } catch (error) {
      throw new Error(`Model <${model.name}>, collection definition: ${error}`); 
    }
  });
  
  modelGenerator.once("modelStructureReady", (result) => {
    return result;
  });

    modelGenerator.define(cubismo, application, connection, appModelDefinition, builtInClasses)
}