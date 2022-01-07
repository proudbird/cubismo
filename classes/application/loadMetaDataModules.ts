import loadModule from "../loadModule";
import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";

import Cubismo from "../../core/Cubismo";
import Application from "./Application";
import { ApplicationStructure } from "./defineAppStructure";
import i18next from "i18next";

const LoadableMetaDataClasses = [
  'Modules',
  'Constants',
  'Catalogs',
  'Registrators',
  'DataSets'
]

export default function loadMetaDataModules(cubismo: Cubismo, application: Application, applicationStructure: ApplicationStructure) {

  // loadModule(
  //   join(applicationStructure.dirname, 'Application.js'), 
  //   'Application', 
  //   application.id, 
  //   application, 
  //   application, 
  //   application, 
  //   undefined, 
  //   cubismo);
               
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

        initInternationalization(cubeName, dirname(cubeStructure.filename));
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
       if (className === 'Modules' && existsSync(objectFileName)) {
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

function initInternationalization(cubeName: string, cubeDir: string) {

  const vocabulary = getVocabulary(cubeDir);
  for(let lang in vocabulary) {
    i18next.addResources(lang, cubeName, vocabulary[lang]);
  }
}

function getVocabulary(cubeDir: string): any {

  const vocabularyFileName = join(cubeDir, 'vocabulary.json');
  let vocabulary: any = {};
  if(existsSync(vocabularyFileName)) {
    vocabulary = JSON.parse(readFileSync(vocabularyFileName, 'utf-8'));
  }

  return vocabulary;
}