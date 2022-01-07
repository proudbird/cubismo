import path, { join } from 'path'
import catalogist from 'catalogist'

import Cubismo     from '../../core/Cubismo'
import Application from './Application'
import Cube        from '../Cube'
import { ApplicationSettings } from '../../core/types'
import { MetaDataTypes } from '../../common/Types'


enum MetaDataClasses {
  Modules      = 'Modules',
  Constants    = 'Constants',
  Catalogs     = 'Catalogs',
  Registrators = 'Registrators',
  DataSets     = 'DataSets',
  Enums        = 'Enums',
  Types        = 'Types'
}



type MetaDataClasse = 'Modules' | 'Constants' | 'Catalogs' | 'Registrators' | 'DataSets' | 'Enums' | 'Types'; 

export declare type ApplicationStructure = {
  id: string,
  dirname: string,
  cubes: {
    [name: string]: {
      filename: string,
      classes: { 
        [name: string]: {
          filename: string,
          objects: {
            [name: string]: {
              filename: string,
            }
          }
        }
      }
    }
  }
}

export default function defineAppStructure(
        cubismo : Cubismo,
        application: Application, 
        settings : ApplicationSettings,
        metaDataStructure: any
      ): IModelStructure {
  
  const applicationStructure: ApplicationStructure = { id: application.id, dirname: cubismo.settings.cubes, cubes: {} };        
  const modelStructure = {};

  for(let cubeName of settings.cubes) {
    defineCubeStructure(
      cubeName, 
      cubismo,
      metaDataStructure,
      application, 
      settings, 
      applicationStructure, 
      modelStructure
    );
  }

  return { modelStructure, applicationStructure };
}

function defineCubeStructure(
  cubeName: string, 
  cubismo : Cubismo,
  metaDataStructure: any,
  application: Application, 
  settings: ApplicationSettings, 
  applicationStructure, 
  modelStructure
) {

  const cubeFullPath = join(cubismo.settings.cubes, cubeName, '.dist');
  const cubeModuleFile = `${cubeName}.js`;
  
  const _cube = new Cube(
    cubismo,
    application,
    undefined,
    metaDataStructure.Cube,
    cubeName,
    cubeFullPath,
    cubeModuleFile);
                        
  const cubeFullModuleFile = path.join(cubeFullPath, cubeModuleFile);
  application.addCube(_cube, cubeFullModuleFile);
  application.cubes.addCube(_cube, cubeFullModuleFile);
  applicationStructure.cubes[cubeName] = { filename: cubeFullModuleFile, classes: {} };

  const cubeTree = catalogist.treeSync(
    cubeFullPath, {
      withSysRoot: true,
      childrenAlias: "next"
    }
  );

  for(let cubeLevel of cubeTree) {

    if(cubeLevel.ext.includes('.map')) {
      // skip file
      continue;
    }

    if(cubeLevel.fullName.includes('.d.')) {
      // skip file
      continue;
    }

    if(cubeLevel.name === 'Types') {
      continue;
    }
    
    const className = cubeLevel.fullName;
    if(!cubeLevel.isDirectory) {
      continue;
    }

    let classModuleFile = cubeLevel.fullName + '.js'

    const classDefinition = metaDataStructure[className]
    if(!classDefinition) {
      throw new Error(`Application <${application.id}> doesn't has a Data Class definition for ${className}`);
    }

    const _metaDataClass = new classDefinition.classMaker(
      cubismo,
      application,
      _cube,
      classDefinition.type,
      cubeLevel.name,
      cubeLevel.fullPath,
      classModuleFile);
    
    const fileName = path.join(cubeLevel.fullPath, classModuleFile)

    _cube.addClass(_metaDataClass, fileName);

    applicationStructure.cubes[cubeName].classes[cubeLevel.name] = { filename: path.join(cubeLevel.fullPath, classModuleFile), objects: {} };

    for(let classLevel of cubeLevel.next) {

      if(classLevel.ext.includes('.map') || classLevel.fullName.includes('.d')) {
        // skip file
        continue;
      }

      if(classLevel.dirName === 'Modules') {
        const _metaDataObject = new classDefinition.objectMaker(
              cubismo,
              application,
              _cube,
              classDefinition.type,
              classLevel.name,
              classLevel.dirFullName,
              classLevel.fullName)
        _cube['Modules'].addObject(_metaDataObject, classLevel.fullPath);
        applicationStructure.cubes[cubeName].classes[cubeLevel.name].objects[classLevel.name] = { filename: classLevel.fullPath };
        continue;
      }

      let objectName: string
      let objectModuleFile: string
      let objectModelDefinition: any

      let fullFileName = path.join(cubeLevel.fullPath, classLevel.fullName)
      let fileName = classLevel.fullName
      let splitedName = fileName.split(".")
      
      if (splitedName[0] === className && splitedName[2] === "js") {
        objectName = splitedName[1]
        objectModuleFile = fullFileName
      }

      if (splitedName[0] === className && splitedName[2] === "Model" && splitedName[3] === "json") {
        objectName = splitedName[1]
        objectModelDefinition = require(fullFileName)
      }

      if (objectModelDefinition && objectName) {

        const moduleFileName= fullFileName.replace('Model.json', 'js');

        for (let key in objectModelDefinition) {
          const definition = objectModelDefinition[key]
          definition.id = key;

          applicationStructure.cubes[cubeName].classes[cubeLevel.name].objects[definition.name] = { filename: moduleFileName };

          if(classLevel.dirName === 'Enums') {
            const values = objectModelDefinition[key].values    
            const _metaDataObject = new classDefinition.objectMaker(
                  cubismo,
                  application,
                  _cube,
                  classDefinition,
                  definition.name,
                  definition.id,
                  values)
            _cube['Enums'].addObject(_metaDataObject, moduleFileName);
            
            const modelName = [_cube.name, classDefinition.type, definition.name].join(".")
            MetaDataTypes.storeTypeById(definition.id, modelName);
    
            continue;
          }

          modelStructure[key] = {
            definition: definition,
            module: moduleFileName
          };
        }
      }
    }
  }
}