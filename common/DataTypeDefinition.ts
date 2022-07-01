import DataType from "./DataType";
import NumberSignType from "./NumberSignType";

type MetaDataType = '';

export default class DataTypeDefinition {

  #type: DataType<MetaDataType> 
  get type(): DataType<MetaDataType> {
    return this.#type;
  }

  #length: number;
  /** in case of numbers - the total count of significant digits in the whole number, 
   * that is, the number of digits to both sides of the decimal point; in case of strings - 
   * just the string length */
  get length(): number {
    return this.#length;
  }

  /** is the count of decimal digits in the fractional part, to the right of the decimal point */
  #scale: number;
  get scale(): number {
    return this.#scale;
  }

  #numberSignType: NumberSignType;
  get numberSignType(): NumberSignType {
    return this.#numberSignType;
  }

  constructor(type: DataType<MetaDataType>, length?: number, scale?: number, numberSignType?: NumberSignType) {
    this.#type = type;
    this.#length = length;
    this.#scale = scale;
    this.#numberSignType = numberSignType || type === 'number' ? NumberSignType.PositiveAndNegative : undefined;
  }
}