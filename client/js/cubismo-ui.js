/* globals webix $$ */
window.applicationId = window.location.pathname.replace("/","");

webix.Date.startOnMonday = true;

webix.protoUI({
  name:"MainWindow",
  $init: function (config) {
    this.$ready.push(this._Init);
  },
  _Init: function () {
    window.windowId = this.config.id;
    callServer("event",
      { viewId: this.config.id, element: this.config.name, event: "onLoad" }
    );
  }
}, webix.ui.layout);

webix.protoUI({
  name:"View",
  $init: function (config) {
    this.$ready.push(this._Init);
  },
  _Init: function () {
    callServer("event",
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
          callServer("event", { 
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

webix.protoUI({
  name:"Treetable",
  defaults:{
    scroll: true,
  },
  $init: function (config) {
    this.$ready.push(this._Init);
    this.$ready.unshift(this._after_init_call);
  },
  _after_init_call: function () {
  
  },
  _Init: function () {
    this.getData();
  },
  getData: function() {
    callServer("getData", {
        viewId: this.config.viewId,
        element: this.config.name
      }, function(err, data) {
        if(err) {
          return console.log("Error on getting data from server");
        }
        this.parse(data);
    });
  }
}, webix.ui.treetable);

webix.protoUI({
  name: "Viewbar",
  defaults:{
    on:{
    }
  },
  addView: function(obj) {
    const id = webix.ui.tabview.prototype.addView.call(this, obj);
    const tab = $$(id);
    tab.show();
    this.removeView("dummy");
    return id;
  }
}, webix.ui.tabview);