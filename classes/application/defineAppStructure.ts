import { readdirSync, statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { watch } from 'chokidar';
import anymatch from 'anymatch';

import Cubismo from '../../core/Cubismo'
import Logger from '../../common/Logger';
import Application from './Application'
import Cube from '../Cube'
import builtInClasses from './builtInClasses';
import { ApplicationSettings } from '../../core/types'
import { MetaDataTypes } from '../../common/Types'
import MetaDataCollection from '../MetaDataCollection';
import { ModelDefinition } from '../../database/types';
import { getAppMemberFileName } from './helpers';
import { MetaDataClassDefinition } from '../../classes/MetaData';

const EXCLUDE_MATCHERS = [
  '**/*.d.*',
  '**/_test*',
  '**/Views/**',
  '**/Types/**'
];

type AppMemberPath = {
  module: string;
  clientModule: string;
};

export type AppMember = AppMemberPath & Partial<{
  [name: string]: AppMember;
}>;

export declare type ApplicationStructure = {
  id: string;
  path: string;
  cubes: Record<string, AppMember>;
}

export type ModelStructure = {
  [name: string]: {
    definition: ModelDefinition,
    module: string,
  }
}

export default function defineAppStructure(
  cubismo : Cubismo,
  application: Application, 
  settings : ApplicationSettings,
) {
  
  const appStructure: ApplicationStructure = { 
    id: application.id, 
    path: cubismo.settings.cubes, 
    cubes: {},
  };        

  const modelStructure = {} as ModelStructure;

  for(let cubeName of settings.cubes) {
    defineCubeStructure(
      cubeName, 
      cubismo,
      application, 
      appStructure,
      modelStructure,
    );
  }

  return { modelStructure, appStructure };
}

function defineCubeStructure(
  cubeName: string, 
  cubismo : Cubismo,
  application: Application, 
  appStructure: ApplicationStructure,
  modelStructure: ModelStructure,
) {

  const cubePath = join(cubismo.settings.cubes, cubeName);
  const filename = getAppMemberFileName(cubePath, cubeName);

  const { member: cube } = registerApplicationMember({
    cubismo,
    owner: application,
    application,
    cube: undefined,
    type: 'Cube',
    name: cubeName,
    filename,
  });

  application.cubes.add({
    type: 'Cube',
    name: cubeName,
    element: cube,
  });

  const clientModule = getAppMemberFileName(cubePath, `${cubeName}.client`);

  appStructure.cubes[cubeName] = {
    module: filename,
    clientModule
  } as AppMember;

  if(process.env.NODE_ENV === 'development') {
    watchChanges(cubePath, cubismo, application, cube);
  }

  for(let maybeClassName of readdirSync(cubePath)) {
    const path = join(cubePath, maybeClassName);

    if(!statSync(path).isDirectory()) {
      continue;
    }

    if(anymatch(EXCLUDE_MATCHERS, path)) {
      continue;
    }

    appStructure.cubes[cube.name][maybeClassName] = {} as AppMember;

    defineClassStructure(
      path,
      cubismo,
      application, 
      cube,
      maybeClassName,
      appStructure,
      modelStructure,
    );
  }
}

function defineClassStructure(
  path: string,
  cubismo : Cubismo,
  application: Application, 
  cube: Cube,
  className: string,
  appStructure: ApplicationStructure,
  modelStructure: ModelStructure,
) {
  const { definition: classDefinition } = registerApplicationMember({
    cubismo,
    owner: cube as unknown as MetaDataCollection,
    application,
    cube: cube,
    type: className,
    name: className,
  });

  for(let maybeControllerName of readdirSync(path)) {
    const controllerPath = join(path, maybeControllerName);

    if(anymatch(EXCLUDE_MATCHERS, controllerPath)) {
      continue;
    }

    if(!statSync(controllerPath).isDirectory()) {
      const filename = join(path, maybeControllerName);

      const { objectName } = getFileRoots(filename);

      const _metaDataObject = new classDefinition.objectMaker({
        cubismo,
        application,
        cube: cube,
        type: classDefinition.objectType,
        name: objectName,
        filename,
      });

      (cube[className] as MetaDataCollection).add({
        name: objectName,
        type: classDefinition.objectType,
        element: _metaDataObject, 
      });

      const clientModule = getAppMemberFileName(controllerPath, `${objectName}.client`);

      appStructure.cubes[cube.name][className][objectName] = {
        module: filename,
        clientModule,
      } as AppMember;
    } else {

      defineController(
        controllerPath,
        application,
        cube,
        className,
        classDefinition,
        appStructure,
        modelStructure,
      );
    }
  }
}

function defineController(
  path: string,
  application: Application, 
  cube: Cube,
  className: string,
  classDefinition: MetaDataClassDefinition,
  appStructure: ApplicationStructure,
  modelStructure: ModelStructure,
) {
  for(let controllerFilename of readdirSync(path)) {
    const objectPath = join(path, controllerFilename);
    const { objectName, isModel } = getFileRoots(objectPath);

    if(!isModel) {
      // on this level we need only models
      continue;
    }

    const filename = getAppMemberFileName(path, objectName);
    const modelDefinition = require(objectPath);

    for (let key in modelDefinition) {
      const definition = modelDefinition[key]
      definition.id = key;

      const modelName = `${cube.name}.${className}.${objectName}`;
       
      if(className === 'Enums') {
        const _metaDataObject = new classDefinition.objectMaker({
          application,
          cube,
          type: classDefinition.objectType,
          name: objectName,
          model: definition
        });

        cube[className].add({
          name: objectName,
          type: classDefinition.objectType,
          element: _metaDataObject
        });
        
        const model = {
          definition: definition,
          module: filename,
        };

        Object.defineProperty(modelStructure, modelName, {
          value: model,
          enumerable: false,
        });

        MetaDataTypes.storeTypeById(definition.id, modelName);

      } else {

        const model = {
          definition: definition,
          module: filename,
        };

        modelStructure[key] = model;
        Object.defineProperty(modelStructure, modelName, {
          value: model,
          enumerable: false,
        });
      }
    }

    appStructure.cubes[cube.name][className][objectName] = {
      module: filename,
    } as AppMember;
  }
}

function getFileRoots(path: string) {
  let className: string;
  let objectName: string;
  let isModel = false;

  const dirName = dirname(path);
  className = basename(dirName);

  if(className !== 'Modules') {
    className = basename(dirname(dirName));
  }
  
  const filename = basename(path);
  const parts = filename.split('.');

  if(parts.length < 3) {
    // we have only name and extension
    objectName = parts[0];
  } else {
    objectName = parts[0];
    isModel = parts[1] === 'Model';
  }

  return { className, objectName, isModel };
}

interface MemberRegistrationOptions {
  cubismo: Cubismo;
  owner: Application | MetaDataCollection;
  application: Application;
  cube: Cube | undefined;
  type: string;
  name: string;
  filename?: string;
}

function registerApplicationMember({
  cubismo,
  owner,
  application,
  type,
  cube,
  name,
  filename,
}: MemberRegistrationOptions) {

  const definition = builtInClasses[type];
    if(!definition) {
      throw new Error(`Application <${application.id}> doesn't has a Data Class definition for ${name}`);
    }

  const member = new definition.classMaker({
    cubismo,
    application,
    cube,
    type: definition.type,
    name,
    filename
  });
  
  owner.add({ 
    name, 
    type: definition.type,
    element: member, 
  });

  return { member, definition, filename };
}

function getMetaDataClassDefinition(type: string, application: Application) {
  const definition = builtInClasses[type];

  if(!definition) {
    throw new Error(`Application <${application.id}> doesn't has a Data Class definition for ${type}`);
  }

  return definition;
}

function watchChanges(path: string, cubismo: Cubismo, application: Application, cube: Cube) {

  // watch for classes
  watch(path, { 
    ignored: EXCLUDE_MATCHERS, 
    ignoreInitial: true, 
    depth: 0 
  })
    .on('addDir', (path) => {
      const { className } = getFileRoots(path);

      registerApplicationMember({
        cubismo,
        owner: cube as unknown as MetaDataCollection,
        application,
        cube,
        type: className,
        name: className,
      });
    })

    .on('unlinkDir', (path) => {
      const { className } = getFileRoots(path);

      cube.remove(className);
    });

  // watch for controllers
  watch(path, { 
    ignored: EXCLUDE_MATCHERS, 
    ignoreInitial: true, 
    depth: 1, 
  })
    .on('add', (path) => {
      const { className, objectName, isModel } = getFileRoots(path);

      if(!isModel) {
        if(className === 'Modules') {
          const classDefinition = getMetaDataClassDefinition(className, application);

          const _metaDataObject = new classDefinition.classMaker({
            cubismo,
            application,
            cube,
            type: classDefinition.type,
            name: objectName,
            dirname: dirname(path),
            filename: path,
          });
  
          (cube['Modules'] as MetaDataCollection).add({
            name: objectName,
            type: classDefinition.type,
            element: _metaDataObject, 
          });

          _metaDataObject.load();
        }
      }
    })

    .on('unlink', (path) => {
      const { className, objectName, isModel } = getFileRoots(path);
      
      if(!isModel) {
        if(className === 'Modules') {
          delete cube['Modules'][objectName];
        }
      }
    })

    .on('change', async(path) => {
      const { className, objectName, isModel } = getFileRoots(path);
      
      if(!isModel) {
        if(className === 'Modules') {
          const module = cube['Modules'][objectName];
          const result = module.load && module.load();
          if(result) {
            Logger.debug(`Application <${application.id}>; Cube <${cube.name}>: Module <${module.name}> reloaded`);
          }
        }
      }
    });
}
