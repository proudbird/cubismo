"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class QueryResultEntry {
    constructor(record, fieldsMap) {
        for (let key in record) {
            const attribute = fieldsMap.get(key);
            Object.defineProperty(this, attribute.alias, {
                get() {
                    if (attribute.dataType === 'FK') {
                        const reference = attribute.model.findOne({ where: { id: record[key] } });
                        return reference;
                    }
                    else {
                        return record[key];
                    }
                }
            });
        }
    }
}
exports.default = QueryResultEntry;
//# sourceMappingURL=QueryResultEntry.js.map