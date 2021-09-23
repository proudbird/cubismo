import { RangeErrors } from "../errors/Errors";
import validator from "validator";

export function TestValidity(value: any, rule: RuleTest, etalon: any, errorAnnotation?: string): void {
  if(!errorAnnotation) {
    errorAnnotation = etalon;
  }
  const tester = new RuleMap[rule](etalon);
  const testResult = tester.test(value);
  if(testResult.error) {
    throw new Error(`${errorAnnotation} (${testResult.error})`)
  }
}

export declare type RuleTest = 'email' | 'identificator' | 'positive' | 'less';

type TestResult = {
  error: null | string
}

class PositiveValidityRuleTest {

  etalon: number;
  constructor(etalon: number) {
    this.etalon = etalon;
  }

  test(value: any): TestResult {
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

  test(value: any): TestResult {
    let error = null;
    if(value > this.etalon) {
      error = RangeErrors.MAX_LENGTH_EXCEEDED;
    }
    return { error };
  }
}

class IdentificatorValidityRuleTest {

  etalon: number;
  constructor(etalon: number) {
    this.etalon = etalon;
  }

  test(value: any): TestResult {
    let error = null;
    if(!value) {
      error = new SyntaxError(`Value can't be empty`);
    } else {
      if(startsFromDigit(value)) {
        error = new SyntaxError(`Value can't start with digit`);
      }
      if(containsSpecialCharacters(value)) {
        error = new SyntaxError(`Value can't contain special characters`);
      }
    }
    return { error };
  }
}

class EmailValidityRuleTest {

  etalon: number;
  constructor(etalon: number) {
    this.etalon = etalon;
  }

  test(value: any): TestResult {
    let error = null;
    if(!validator.isEmail(value)) {
      error = new SyntaxError(`Value has wrong format`);
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

// export class ValidityRule {

//   static identificator: ValidityRuleTest = IdentificatorValidityRuleTest;
//   static positive: ValidityRuleTest = PositiveValidityRuleTest;
//   static email: ValidityRuleTest = EmailValidityRuleTest;
//   static less(etalon: number): ValidityRuleTest {
//     return new LessValidityRuleTest(etalon);
//   }
// }

const RuleMap = {
  'email'         : EmailValidityRuleTest,
  'identificator' : IdentificatorValidityRuleTest,
  'positive'      : PositiveValidityRuleTest,
  'less'          : LessValidityRuleTest
}