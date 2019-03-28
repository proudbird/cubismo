/* global Tools */
"use strict";
async function nextCode(application, model, prefix) {
  const definition = model.definition;

  const query = {
    SELECT: ["Code"],
    FROM:   model.name,
    ORDER:  ["Code", "DESC"],
    LIMIT: 1
  }

  if(prefix) {
    query.WHERE = [ { STARTSWITH: ["Code", prefix] } ];
  }

  let last = await application.Query.execute(query);
  last = Tools.get(last, "[0][0].Code") || 0;
  let lastLetter = last.toString().replace(/(\d)/g, "").slice(-1);
  let digits = last.slice(last.lastIndexOf(lastLetter) + 1);
  prefix = prefix || last.replace(digits, "");
  last = parseInt(digits) || 0;
  let next = last + 1;
  if(definition.codeType === "INTEGER") {
    
  } else {
    if(!prefix) {
      prefix = "";
    }
    next = next.toString().padStart(definition.codeLenght, prefix + "0000000000000000000000000000000000000");
  }

  return next;
}

module.exports.nextCode = nextCode;