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

describe('Table', function() {

  describe('#constructor', function() {
    it('should create an instance of Table class', function() {
      expect(new Table()).to.be.an.instanceof(Table);
    });
  });

  describe('columns', function() {
    describe('#add("FullName")', function() {
      it('should create an instance of TableColumn class', function() {
        const column = (new Table()).columns.add("FullName");
        expect(column.constructor.name).to.equal('TableColumn');
      });
    });
  });

  describe('columns', function() {
    describe('#add("FullName", new StringDefinition(25), "Full name")', function() {
      it(`should create instance with properties "name" = "FullName" 
          and "title" = "Full name" and "index" = 0`, 
        function() {
          const etalon = { name: "FullName", title: "Full name", index: 0, type: new StringDefinition(25) };
          const column = (new Table()).columns.add("FullName", new StringDefinition(25), "Full name");
          sinon.assert.match(column, etalon);
      });
    });
  });
  
  describe('columns', function() {
    describe('#add("1FullName")', function() {
      it(`should throw error, because argument "name" can't start with digit`, 
        function() {
          expect(() => { (new Table()).columns.add("5FullName") }).to.throw();
      });
    });
  });

  describe('columns', function() {
    describe('#add("Full+Name")', function() {
      it(`should throw error, because argument "name" can contain only digits, letters and '_'`, 
        function() {
          expect(() => { (new Table()).columns.add("Full+Name") }).to.throw();
      });
    });
  });

  describe('columns', function() {
    describe('#add("Full_Name")', function() {
      it(`should not to throw error, because argument "name" doesn't contain forbidden characters`, 
        function() {
          expect(() => { (new Table()).columns.add("Full_Name") }).not.to.throw();
      });
    });
  });

  describe('columns', function() {
    describe('#remove(0)', function() {
      it('should delete column with index "0"', function() {
        const table = new Table();
        const column = table.columns.add("FullName", new StringDefinition(25), "Full name");
        expect(() => { table.columns.remove(0) }).not.to.throw();
      });
    });
  });
});