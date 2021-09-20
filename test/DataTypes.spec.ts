import sinon from 'sinon';
import { expect, should  } from 'chai';
import StringDefinition from "../common/StringDefinition";
import NumberDefinition from "../common/NumberDefinition";
import DataType from "../common/DataType";
import { MAX_STRING_LENGTH } from "../environment/Constants";
import { MAX_NUMBER_LENGTH } from "../environment/Constants";
import { RangeErrors } from "../errors/Errors";
import Table from "../common/DataCollections/Table";
import NumberSignType from '../common/NumberSignType';

describe('StringDefinition', function() {

  describe('#constructor(25)', () => {
    it('should create instance with property "length" 25', () => {
      const newInstance = new StringDefinition(25);
      const etalon = { length: 25 };
      
      should().equal(newInstance.length, 25);
    });
  });

  describe(`#constructor(${MAX_STRING_LENGTH + 1})`, () => {
    it(`should throw error because max string length of ${MAX_STRING_LENGTH} characters exceeded`, () => {
      should().throw(() => new StringDefinition(MAX_STRING_LENGTH + 1), Error);
    });
  });

  describe(`#constructor(-1)`, () => {
    it(`should throw error because string length can't be negative`, () => {
      should().throw(() => new StringDefinition(-1), Error);
    });
  });

  describe(`#length`, () => {
    it(`should be 30`, () => {
      should().equal((new StringDefinition(30).length), 30);
    });
  });

  describe(`#type`, () => {
    it(`should be ${'string'}`, () => {
      should().equal((new StringDefinition(30).type), 'string');
    });
  });
});

describe('NumberDefinition', function() {

  describe('#constructor(5, 2)', () => {
    it('should create instance with properties "length" = 5 and "scale" = 2', () => {
      const newInstance = new NumberDefinition(5, 2);
      const etalon = { length: 5, scale: 2, numberSignType: NumberSignType.PositiveAndNegative };
      
      sinon.assert.match(newInstance, etalon);
    });
  });

  describe(`#constructor(${MAX_NUMBER_LENGTH + 1})`, () => {
    it(`should throw error because max number length of ${MAX_NUMBER_LENGTH} digits exceeded`, () => {
      should().throw(() => new NumberDefinition(MAX_NUMBER_LENGTH + 1), Error);
    });
  });


  describe(`#length`, () => {
    it(`should be 8`, () => {
      should().equal((new NumberDefinition(8).length), 8);
    });
  });

  describe(`#scale`, () => {
    it(`should be 3`, () => {
      should().equal((new NumberDefinition(8, 3).scale), 3);
    });
  });

  describe(`#type`, () => {
    it(`should be ${'number'}`, () => {
      should().equal((new NumberDefinition(30).type), 'number');
    });
  });
});