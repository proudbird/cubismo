/* globals Tools Log*/
const Collection = require('./Collection.js');

function Сonstants(application, cube, name, dirname, filename) {
    
    const _ =  {};
    
    Collection.call(this, application, cube, name, dirname, filename);
}
module.exports = Сonstants;