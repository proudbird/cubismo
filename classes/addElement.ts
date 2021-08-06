import Cubismo from '../cubismo'
import { fstat, watch } from 'fs'
import loadModule from './loadModule'

export default function addElement<T extends ICube | IMetaDataClass | IMetaDataObject> (
      element       : T, 
      self          : T,
      cubismo       : Cubismo,
      application   : IApplication,
      elements      : Map<string, [ICube | IMetaDataClass | IMetaDataObject, string]>, 
      cache         : Map<string, [number, any]>, 
      moduleFileName: string
  ): T {

  if(elements.has(element.name)) {
    throw new Error(`Application '${element.application.id}' already has ${element.type} '${element.name}'`)
  }

  elements.set(element.name, [element, moduleFileName])

  // // to skip internal module priordail.js
  // if(process.env.NODE_ENV === "development") {
  //   const value = elements.get(element.name)
  //   if(!(
  //         element.name === 'Modules'  || 
  //         element.name === 'Catalogs' || 
  //         element.name === 'DataSets' || 
  //         element.name === 'Enums'    || 
  //         element.name === 'Collections'
  //   )) {
  //     loadModule(value[1], element.type, element.name, self, application, element, cache, cubismo);
  //     watch(value[1], (eventType) => {
  //       loadModule(value[1], element.type, element.name, self, application, element, cache, cubismo);
  //     })
  //   }
  // }

  Object.defineProperty(self, element.name, {
    enumerable: true,
    get() {
      const value = elements.get(element.name)
      if(process.env.NODE_ENV === "production") {
        if(!(element.name === 'Modules' || element.name === 'Catalogs' || element.name === 'DataSets' || element.name === 'Enums')) {
          loadModule(value[1], element.type, element.name, self, application, element, cache, cubismo);
        }
      }
      return value[0]
    }
  })

  return element
}