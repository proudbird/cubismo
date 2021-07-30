import fs     from 'fs'
import demand from 'demander'
import Import from '../core/Import'

export default function loadModule<T extends ICube | IMetaDataClass | IMetaDataObject>(
    fileName   : string, elementType: string, 
    elementName: string, self       : IApplication | ICube | IMetaDataClass, application: IApplication,
    context    : IApplication | ICube | IMetaDataClass,
    cache      : Map<string, [number, any]>
  ): any {

  if (!fs.existsSync(fileName)) {
  throw new Error(`Can't find module file '${fileName}' for ${elementType} '${elementName}'`)
  }

  let cachedModule
  let lastUpdated = fs.statSync(fileName).mtime.getTime()

  if(cache.has(fileName)) {
  cachedModule = cache.get(fileName)
  if (lastUpdated === cachedModule[0]) {
  return cachedModule[1]
  }
  }

  // TODO: Cube - it is not a context
  const loaded = demand(fileName, context, 
                      { 
                        Application: application,
                        Cube       : context,
                        me: context,
                        Import,
                        Workspace  : application.workspace
                      },
                      { 
                        hideGlobals: ['all'] 
                      })
  cache.set(fileName, [lastUpdated, loaded])

  return loaded
}