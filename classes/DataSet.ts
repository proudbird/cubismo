import MetaDataObject from './MetaDataObject';
import MetaDataInstance from './MetaDataInstance';

export default class DataSet extends MetaDataObject {

  newRecord(predefinedValues?: any): MetaDataInstance {
    return super.new(predefinedValues);
  }
}