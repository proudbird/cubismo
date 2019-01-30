/* globals Tools Log*/
const Base = require('./Base.js');

function Register(application, cube, name, dirname, filename) {
    
    const _private =  {};
    
    Base.call(this, application, cube, name, dirname, filename);
}
module.exports = Register;