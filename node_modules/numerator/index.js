function next(number = 0, expand = false) {

  let prev = number.toString();

  let numberLength = prev.length;
  const nonDigits = prev.toString().replace(/(\d)/g, "");
  const lastNonDigit = nonDigits.slice(-1);
  const index = prev.lastIndexOf(lastNonDigit);

  if(nonDigits && index === numberLength-1) {
    throw new TypeError("[Numerator] Invalid argument: parameter 'number' must end with digit");
  }

  const lastDigits = prev.slice(index + 1) || prev;
  const prefix = prev.substring(0, index + 1);

  prev = parseInt(lastDigits);

  let next = prev + 1;
  
  if((prefix + next).length > numberLength) {
    if(expand) {
      numberLength++;
    } else {
      throw new TypeError("[Numerator] Invalid argument: parameter 'number' achieved its maximum");
    }
  }

  next = next.toString().padStart(numberLength, prefix + "0000000000000000000000000000000000000");

  return next;
}

module.exports = next;

console.log(next("D999", true));
const assert = require("assert");
assert.equal(next("MAX999", true), "MAX1000");