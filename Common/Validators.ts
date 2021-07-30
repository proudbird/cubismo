import { RangeErrors } from "../Errors/Errors";

export function TestValidity<RuleTest extends ValidityRuleTest>(value: any, rule: RuleTest, errorAnnotation: string): void {
  const testResult = rule.test(value);
  if(testResult.error) {
    throw new Error(`${errorAnnotation} (${testResult.error})`)
  }
}

interface ValidityRuleTest {
  test(value: any): TestResult;
}

type TestResult = {
  error: null | string
}

class PositiveValidityRuleTest {

  static test(value: number): TestResult {
    let error = null;
    if(value < 0) {
      error = RangeErrors.CAN_NOT_BE_NEGATIVE;
    }
    return { error };
  }
}

class LessValidityRuleTest {

  etalon: number;
  constructor(etalon: number) {
    this.etalon = etalon;
  }

  test(value: number): TestResult {
    let error = null;
    if(value > this.etalon) {
      error = RangeErrors.MAX_LENGTH_EXCEEDED;
    }
    return { error };
  }
}

class IdentificatorValidityRuleTest {

  static test(value: string): TestResult {
    let error = null;
    if(startsFromDigit(value)) {
      error = new SyntaxError(`Value can't start with digit`);
    }
    if(containsSpecialCharacters(value)) {
      error = new SyntaxError(`Value can't contain special characters`);
    }
    return { error };
  }
}

function startsFromDigit(value: string) {
  return value.match('^[0-9]');
}

function containsSpecialCharacters(value: string) {
  return !value.match('^[a-zA-Z_0-9]*$');
}

export class ValidityRule {

  static identificator: ValidityRuleTest = IdentificatorValidityRuleTest;
  static positive: ValidityRuleTest = PositiveValidityRuleTest;

  static less(etalon: number): ValidityRuleTest {
    return new LessValidityRuleTest(etalon);
  }
}

