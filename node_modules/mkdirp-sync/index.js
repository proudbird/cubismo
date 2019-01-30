const fs = require('fs')
const path = require('path')

module.exports = function (dir, mode) {
    const sep = path.sep, arr = dir.split(sep)
    let i = 0, len = arr.length, tmp
    for (; i < len; i++) {
        tmp = arr.slice(0, i + 1).join(sep);
        if (tmp === '') continue;
        if (!fs.existsSync(tmp)) {
            try {
                fs.mkdirSync(tmp, mode);
            } catch (e) {
                switch (e.code) {
                    case 'EEXIST':
                        break;
                    case 'ENOTDIR' :
                        throw `${tmp.slice(0, tmp.lastIndexOf(sep))} is not a directory`
                    default:
                        throw e
                }
            }
        }
    }
}