/* globals Tools Log*/
const Base = require('./Base.js');

function Collection(application, cube, name, dirname, filename) {
    
    const _private =  {};
    _private.elements = {};
    
    Base.call(this, application, cube, name, dirname, filename);
    
    this.addElement = function(name, element) {
        _private.elements[name] = element;
        Object.defineProperty(this, name, {
          enumerable: true,
          set() {
              const err = new Error("It is not allowed to change propery '" + name + "' of " + this.name + " manually.");
              Log.error(err.message, err);
          },
          get() {
            return element;
          }
        });
    }
    
    Object.defineProperty(this, "elements", {
      enumerable: false,
      set() {
          const err = new Error("It is not allowed to change propery 'elements' of " + name + " manually.");
          Log.error(err.message, err);
      },
      get() {
        return _private.elements;
      }
    });
}
module.exports = Collection;