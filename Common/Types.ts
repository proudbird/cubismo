
global["isTypeOf"] = isTypeOf;

const typesById: Map<string, string> = new Map();

export class MetaDataTypes {

  static storeTypeById(id: string, type: string): void {

    const _type = typesById.get(id);
    if(_type && (_type !== type)) {
      Logger.warn(`Type with ID <${id}> is already registerd`)
      //throw new Error(`Type with ID <${id}> is already registerd`);
    }

    typesById.set(id, type);
  }

  static getTypeById(id: string): string {

    return typesById.get(id);
  }
}


/**
 * Checks whether value has a certain type. Specified type can be a built-in
 * JavaScript type, or the type of a MetaData object. For example: `Common.Catalogs.Users`
 * 
 * @param {any} value - A value to check type of
 * @param {string} type - Name of the type a value must have
 * @returns {boolean} `true` if a value has specified type; `false` overwise
 */
export function isTypeOf(value: any, type: string): boolean {

  const _valueType = (typeof value).toLowerCase();
  const _type =  type.toLowerCase();
  
  if(_type === 'Array' && Array.isArray(value)) {
    return false;
  }

  if(_type === 'object' && Array.isArray(value)) {
    return false;
  }

  if(_valueType === _type) {
    return true;
  }
  
  if(value.type) {
    return (value.type().toLowerCase() === _type);
  }

  return false;
}