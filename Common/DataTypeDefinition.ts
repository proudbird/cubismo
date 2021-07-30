import DataType from "./DataType";
import NumberSignType from "./NumberSignType";

type MetaDataType = '';

export default class DataTypeDefinition {

  #type: DataType<MetaDataType> 
  get type(): DataType<MetaDataType> {
    return this.#type;
  }

  #length: number;
  get length(): number {
    return this.#length;
  }

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