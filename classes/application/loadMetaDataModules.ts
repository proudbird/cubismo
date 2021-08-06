import loadModule from "../loadModule";
import { existsSync } from "fs";
import { join } from "path";

import Cubismo from "../../cubismo";
import Application from "./Application";
import { ApplicationStructure } from "./defineAppStructure";

const LoadableMetaDataClasses = [
  'Modules',
  'Constants',
  'Catalogs',
  'Registrators',
  'DataSets'
]

export default function loadMetaDataModules(cubismo: Cubismo, application: Application, applicationStructure: ApplicationStructure) {

  loadModule(
    join(applicationStructure.dirname, 'Application.js'), 
    'Application', 
    application.id, 
    application, 
    application, 
    application, 
    undefined, 
    cubismo);
               
  for (let cubeName in applicationStructure.cubes) {
    const cubeStructure = applicationStructure.cubes[cubeName];
    const fileName = cubeStructure.filename;
    const cube = application.cubes[cubeName];
    if (existsSync(fileName)) {
      loadModule(
        fileName,
        'Cube',
        cubeName,
        cube,
        application,
        cube,
        undefined,
        cubismo);
    }
  
    const metaDataClasses = cubeStructure.classes;
    for (let className in metaDataClasses) {
      const metaDataClass = cube[className];
      if (LoadableMetaDataClasses.includes(className)) {
        const fileName = metaDataClasses[className].filename;
        if (existsSync(fileName)) {
          
          loadModule(
            fileName,
            className,
            className,
            metaDataClass,
            application,
            metaDataClass,
            undefined,
            cubismo);
        }
      }
  
      const metaDataObjects = metaDataClasses[className].objects;
      for(let objectName in metaDataObjects) {
       const objectFileName = metaDataObjects[objectName].filename;
       if (existsSync(objectFileName)) {
         const metaDataObject = metaDataClass[objectName];
         loadModule(
           objectFileName,
           className,
           objectName,
           metaDataObject,
           application,
           metaDataObject,
           undefined,
           cubismo);
       }
      }
    }
  }
}