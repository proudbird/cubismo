import { MetaDataClassDefinition } from '../MetaData';

import Cube from '../Cube';
import Modules from '../Modules';
import Module from '../Module';
import Constants from '../Constants';
import Constant from '../Constant';
import Catalogs from '../Catalogs';
import Catalog from '../Catalog';
import CatalogInstance from '../CatalogInstance';
import Registrators from '../Registrators';
import Registrator from '../Registrator';
import RegistratorInstance from '../RegistratorInstance';
import DataSets from '../DataSets';
import DataSet from '../DataSet';
import DataSetRecord from '../DataSetRecord';
import Enums from '../Enums';
import Enum from '../Enum';
import Collections from '../Collections';
import CollectionItem from '../CollectionItem';

const metaDataClassDefinitions = new Map<string, MetaDataClassDefinition>()

function addMetaDataClassDefinition(
  name          : string, 
  objectName    : string, 
  classMaker    : IMetaDataClass, 
  objectMaker?  : IMetaDataObject,
  instanceMaker?: IMetaDataInstance
): MetaDataClassDefinition | undefined {

  if(metaDataClassDefinitions.has(name)) {
    throw new Error(`Application already has type '${name}'`)
  }

  const definition = new MetaDataClassDefinition(name, objectName, classMaker, objectMaker, instanceMaker)
  metaDataClassDefinitions.set(name, definition)

  return definition
}

export default {
  Cube    : addMetaDataClassDefinition('Cube'    , 'Cube'   , Cube   ),
  Modules : addMetaDataClassDefinition('Modules' , 'Module' , Modules , Module),
  Constants: addMetaDataClassDefinition('Constants', 'Constant', Constants, Constant, Constant),
  Catalogs: addMetaDataClassDefinition('Catalogs', 'Catalog', Catalogs, Catalog, CatalogInstance),
  Registrators: addMetaDataClassDefinition('Registrators', 'Registrator', Registrators, Registrator, RegistratorInstance),
  DataSets: addMetaDataClassDefinition('DataSets', 'DataSet', DataSets, DataSet, DataSetRecord),
  Enums   : addMetaDataClassDefinition('Enums'   , 'Enum'   , Enums   , Enum),
  Collections: addMetaDataClassDefinition('Collections', 'Collection', undefined, Collections, CollectionItem)
}