/* globals webix $$ */
window.applicationId = window.location.pathname.replace("/","");

webix.Date.startOnMonday = true;

// MainWindow
webix.protoUI({
  name:"MainWindow",
  $init: function (config) {
    this.$ready.push(this._Init);
  },
  _Init: function () {
    window.windowId = this.config.id;
    eventToServer(
      { viewId: this.config.id, element: this.config.name, event: "onLoad" }
    );
  }
}, webix.ui.layout);

webix.protoUI({
  name: "sidebar",
  defaults:{
    on:{
      onItemClick: function(id) {
        if (id) {
          eventToServer({ 
            viewId   : this.config.viewId, 
            element  : this.config.name, 
            event    : "onItemClick",
            arguments: [this.getItem(id)]
          });
        }
      }
    }
  }
}, webix.ui.sidebar);