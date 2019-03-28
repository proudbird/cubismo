const numerator = module.exports = {};

numerator.next = function(number = 0, expand = false) {

  number = number.toString();

  let next   = 0;
  let index  = -1;
  let prefix = number;
  let length = number.length;

  const filter = new RegExp('(\\d+$)');
  const match  = number.match(filter);
  
  if(match) {
    index  = number.lastIndexOf(match[1]);
    prefix = number.substring(0, index);
    next   = parseInt(match[1]);
  }

  next = next + 1;
  
  if((prefix + next).length > length) {
    if(expand) {
      length++;
    } else {
      throw new Error("[Numerator] Parameter 'number' achieved its maximum");
    }
  }

  next = next.toString().padStart(length, prefix + "0000000000000000000000000000000000000");

  return next;
}