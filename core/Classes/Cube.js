/* globals Tools Log*/
const Collection = require('./Collection.js');

function Cube(application, cube, name, dirname, filename) {
    
    const _private =  {};
    
    Collection.call(this, application, cube, name, dirname, filename);
}
module.exports = Cube;