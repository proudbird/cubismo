import fs     from 'fs'
import demand from 'demander'
import Import from '../cubismo/Import'
import Cubismo from '../cubismo/Cubismo';

export default function loadModule<T extends ICube | IMetaDataClass | IMetaDataObject>(
    fileName   : string, 
    elementType: string, 
    elementName: string, 
    self       : IApplication | ICube | IMetaDataClass, 
    application: IApplication,
    context    : IApplication | ICube | IMetaDataClass,
    cache     ?: Map<string, [number, any]>,
    cubismo   ?: Cubismo
  ): any {

  if (!fs.existsSync(fileName)) {
  throw new Error(`Can't find module file '${fileName}' for ${elementType} '${elementName}'`)
  }

  let cachedModule
  let lastUpdated = fs.statSync(fileName).mtime.getTime()

  if (cache && cache.has(fileName)) {
    cachedModule = cache.get(fileName)
    if (lastUpdated === cachedModule[0]) {
      return cachedModule[1]
    }
  }

  const params = { 
    Application: application,
    Import,
    Workspace  : application.workspace,
    me: context
  };

  // TODO: maybe it is better to call cubes from var Cubes, so we don't need to preload
  // cube modules
  const cubes = cubismo.applications.get(application.id).cubes; 
  for(let index in cubes) {
    const cubeName = cubes[index];
    const cube = application.cubes[cubeName];
    params[cubeName] = cube;
  }

  if(context) {
    const cube = context.cube;
    if(cube) {
      for(let meteDataClassName in application.cubes[cube.name]) {
        params[meteDataClassName] = application.cubes[cube.name][meteDataClassName];
      }
    }
  }

  const loaded = demand(
    fileName, 
    context,         
    params,
    { hideGlobals: ['all'] }
  );

  if (cache) {
    cache.set(fileName, [lastUpdated, loaded]);
  }

  return loaded
}