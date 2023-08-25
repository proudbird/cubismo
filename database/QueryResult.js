"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _QueryResul_fieldsMap, _QueryResul_entries, _a;
Object.defineProperty(exports, "__esModule", { value: true });
const QueryResultEntry_1 = __importDefault(require("./QueryResultEntry"));
class QueryResul {
    constructor(fieldsMap, entries) {
        _QueryResul_fieldsMap.set(this, void 0);
        _QueryResul_entries.set(this, void 0);
        this[_a] = () => {
            let count = 0;
            let done = false;
            let next = () => {
                if (count >= __classPrivateFieldGet(this, _QueryResul_entries, "f").length) {
                    done = true;
                }
                return { done, value: new QueryResultEntry_1.default(__classPrivateFieldGet(this, _QueryResul_entries, "f")[count++], __classPrivateFieldGet(this, _QueryResul_fieldsMap, "f")) };
            };
            return { next };
        };
        __classPrivateFieldSet(this, _QueryResul_fieldsMap, fieldsMap, "f");
        __classPrivateFieldSet(this, _QueryResul_entries, entries, "f");
    }
    toJSON() {
        let result = '';
        const fields = [];
        const attributes = {};
        let index = 0;
        for (let [key, value] of __classPrivateFieldGet(this, _QueryResul_fieldsMap, "f")) {
            if (/_p$/.test(value.alias)) {
                continue;
            }
            attributes[value.alias] = {
                index,
                name: value.alias,
                title: value.alias,
                type: {
                    dataType: value.dataType,
                    length: value.length,
                    scale: value.scale,
                    reference: value.model.definition.id
                }
            };
            fields.push(attributes[value.alias]);
            index++;
        }
        let entries = [];
        for (let entry of __classPrivateFieldGet(this, _QueryResul_entries, "f")) {
            const values = [];
            for (let field of fields) {
                if (/_p$/.test(field.name)) {
                    continue;
                }
                let value = entry[field.name.toLowerCase()];
                if (field.type.dataType === 'FK') {
                    value = [value, entry[field.name.toLowerCase() + '_p']];
                }
                values.push(value);
            }
            entries.push(values);
        }
        const data = {
            attributes,
            entries
        };
        result = JSON.stringify(data);
        return result;
    }
}
exports.default = QueryResul;
_QueryResul_fieldsMap = new WeakMap(), _QueryResul_entries = new WeakMap(), _a = Symbol.iterator;
//# sourceMappingURL=QueryResult.js.map