import DataTypeDefinition from "./DataTypeDefinition";
import DataType from "./DataType";
import { MAX_NUMBER_LENGTH } from "../environment/Constants";
import { TestValidity } from "./Validators";
import NumberSignType from "./NumberSignType";

export default class NumberDefinition extends DataTypeDefinition {

  constructor(length: number, scale?: number, numberSignType?: NumberSignType) {

    super('number', length, scale, numberSignType);

    let errorAnnotation = `Can't create Number Definition. Wrong "length" argument`;
    TestValidity(length, 'less', MAX_NUMBER_LENGTH, errorAnnotation);
    TestValidity(length, 'positive', errorAnnotation);

    errorAnnotation = `Can't create Number Definition. Wrong "scale" argument`;
    TestValidity(scale, 'less', MAX_NUMBER_LENGTH, errorAnnotation);
    TestValidity(scale, 'positive', errorAnnotation);
  }
}