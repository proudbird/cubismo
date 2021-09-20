import DataTypeDefinition from "./DataTypeDefinition";
import DataType from "./DataType";
import { MAX_STRING_LENGTH } from "../environment/Constants";
import { TestValidity, ValidityRule } from "./Validators";

export default class StringDefinition extends DataTypeDefinition {
  constructor(length: number) {
    super('string', length);

    const errorAnnotation = `Can't create String Definition`;
    TestValidity(length, ValidityRule.less(MAX_STRING_LENGTH), errorAnnotation);
    TestValidity(length, ValidityRule.positive, errorAnnotation);
  }
}