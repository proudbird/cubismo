import deepdash from 'deepdash'
import _ from "lodash"
import ShortId from "shortid";
import moment  from "moment";
import CodeGenerator from 'node-code-generator';
import { TestValidity } from "./Validators"

global["Utils"] = _

deepdash(_) 

function guid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0,
      v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
} _.mixin({ 'guid': guid }, { 'chain': false });

function sid () {
  ShortId.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$');
  let id = ShortId.generate();
  return id.replace(/$/g, "0");
} _.mixin({ 'shortId': sid }, { 'chain': false });
  _.mixin({ 'sid': sid }, { 'chain': false }); // alias

  _.mixin({ moment: moment }, { chain: false });

  function generateCode(mask: string): string {
    const generator = new CodeGenerator();
    const code = generator.generateCodes('######', 1, {})[0];
    return code;
  }
  _.mixin({ generateCode: generateCode }, { chain: false });

  _.mixin({ testValidity: TestValidity }, { chain: false });

function traverse(original, fn) {
    const copy = _.cloneDeep(original);
    fn(original);
    _['eachDeep'](copy, (value, key, parent, context) => {
      const node = _.get(original, context.path);
      fn(node);
    });
  } _.mixin({ 'traverse': traverse }, { 'chain': false });