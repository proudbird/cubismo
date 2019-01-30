/* global Tools */
"use strict";

function View(options, params) {
    
    if(!options || !options.name) {
        throw new Error("View must have options atleast with the 'name' property!");
    }
    
    const _private = {};
    _private.callbackOnClose = undefined;
    _private.callbackOnShow  = undefined;
    
    Object.defineProperty(this, "id", { value: Tools.SID(), enumerable: false, writable: false });
    Object.defineProperty(this, "name", { value: options.name, enumerable: false, writable: false });
    
    this.params = params;
    if(options.instance) {
        this.instance = params.instance;
        this.instance.view = this;
    }
    
}