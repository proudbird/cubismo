import catalogist from 'catalogist';
import { join } from 'path';
import anymatch from 'anymatch';
import { mkdirSync, existsSync, moveSync } from 'fs-extra';

function proceed(path: string) {

  const tree = catalogist.treeSync(path, {
    withSysRoot: true,
    childrenAlias: "next"
  });
  
  const INCLUDE_CLASS_MATCHES = [
    'Constants',
    'Catalogs',
    'Registrators',
    'DataSets',
    'Enums',
  ];

  for(let appLevel of tree) {

    if(!appLevel.isDirectory) {
      continue;
    }

    for(let cubeLevel of appLevel.next) {
      if(!cubeLevel.isDirectory) {
        continue;
      }

      if(!anymatch(INCLUDE_CLASS_MATCHES, cubeLevel.name)) {
        continue;
      }

      for(let classLevel of cubeLevel.next) {
        
        if(classLevel.isDirectory) {
          continue;
        }

        const controllerName = classLevel.name.split('.')[1];
        const controllerPath = join(cubeLevel.path, cubeLevel.name, controllerName);

        if(!existsSync(controllerPath)) {
          mkdirSync(controllerPath);
        }

        const newFileName = classLevel.fullName.replace(`${cubeLevel.name}.`, '');
        moveSync(classLevel.fullPath, join(controllerPath, newFileName), {
          overwrite: true
        });
      }
    }
  }
}

proceed(join(__dirname, '../../../cubismo.apps/cubes'));