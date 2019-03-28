const nextNumber = require("../index");
const assert = require("assert");

let number;
let next;

describe('numerator', function () {

  number = "prefix";
  it(`Trying to get next number after "${number}" must throw an error, because it must end with digit`, function(){
    try {
      nextNumber(number);
      return false;
    } catch(err) {
      return true;
    }
  });

  number = "MAX999";
  it(`Trying to get next number after "${number}" must throw an error, because it achieved its maximum and we don't want to expant the numbre's lenght`, function(){
    try {
      nextNumber(number);
      return false;
    } catch(err) {
      return true;
    }
  });

  number = "MAX999";
  next = "MAX1000";
  it(`Next number after "${number}" must be "${next}"`, function(){
    assert.equal(nextNumber(number, false), next);
  });

  number = "0";
  next = "1";
  it(`Next number after "${number}" must be "${next}"`, function(){
    assert.equal(nextNumber(number), next);
  });

  number = "2019-03-00";
  next = "2019-03-01";
  it(`Next number after "${number}" must be "${next}"`, function(){
    assert.equal(nextNumber(number), next);
  });

  number = "PREFIX-001";
  next = "PREFIX-002";
  it(`Next number after "${number}" must be "${next}"`, function(){
    assert.equal(nextNumber(number), next);
  });

  number = "+00*15/1%1/s_s01";
  next = "+00*15/1%1/s_s02";
  it(`Next after complex number "${number}" must be "${next}"`, function(){
    assert.equal(nextNumber(number), next);
  });

});