import DataTypeDefinition from "./DataTypeDefinition";
import DataType from "./DataType";
import { MAX_NUMBER_LENGTH } from "../Environment/Constants";
import { TestValidity, ValidityRule } from "./Validators";
import NumberSignType from "./NumberSignType";

export default class NumberDefinition extends DataTypeDefinition {

  constructor(length: number, scale?: number, numberSignType?: NumberSignType) {

    super('number', length, scale, numberSignType);

    let errorAnnotation = `Can't create Number Definition. Wrong "length" argument`;
    TestValidity(length, ValidityRule.less(MAX_NUMBER_LENGTH), errorAnnotation);
    TestValidity(length, ValidityRule.positive, errorAnnotation);

    errorAnnotation = `Can't create Number Definition. Wrong "scale" argument`;
    TestValidity(scale, ValidityRule.less(MAX_NUMBER_LENGTH), errorAnnotation);
    TestValidity(scale, ValidityRule.positive, errorAnnotation);
  }
}