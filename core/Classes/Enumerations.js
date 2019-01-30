/* globals Tools Log*/
const Collection = require('./Collection.js');

function Enumerations(application, cube, name, dirname, filename) {
    
    const _private =  {};
    
    Collection.call(this, application, cube, name, dirname, filename);
}
module.exports = Enumerations;