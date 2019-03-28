const numerator = require("./numerator");
const assert = require("assert");

let number;
let next;

console.log("Numerator test:\n");

number = "MAX999";
next = "MAX1000";
test(`Next number after "${number}" must be "${next}", because we allowed to increase the numbre's lenght`, function(){
  assert.equal(numerator.next(number, true), next);
});

number = "0";
next = "1";
test(`Next number after "${number}" must be "${next}"`, function(){
  assert.equal(numerator.next(number), next);
});

number = "2019-03-00";
next = "2019-03-01";
test(`Next number after "${number}" must be "${next}"`, function(){
  assert.equal(numerator.next(number), next);
});

number = "PREFIX-001";
next = "PREFIX-002";
test(`Next number after "${number}" must be "${next}"`, function(){
  assert.equal(numerator.next(number), next);
});

number = "+00*15/1%1/s_s01";
next = "+00*15/1%1/s_s02";
test(`Next after complex number "${number}" must be "${next}"`, function(){
  assert.equal(numerator.next(number), next);
});

  number = "prefix";
  test(`Trying to get next number after "${number}" must throw an error, because it ends with non-digit symbol and we don't want to increase the numbre's lenght`, function(){
    assert.throws(function() {
      numerator.next(number)
    }, Error)
  });

  number = "MAX999";
  test(`Trying to get next number after "${number}" must throw an error, because it achieved its maximum and we don't want to increase the numbre's lenght`, function(){
    assert.throws(function() {
      numerator.next(number)
    }, Error)
  });

  function test(message, fn) {
    let mark = "+";
    try {
      fn
    } catch(err) {
      mark = "-";
    }
    console.log(mark, message);
  }