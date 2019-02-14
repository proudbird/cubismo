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
    console.log("id: " + this.config.id)
    console.log("view id: " + this.config.viewId)
    callServer("event",
      { viewId: this.config.viewId, element: this.config.name, event: "onLoad" }
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
  name: "Toolbar",
  defaults:{
    on:{
     
    }
  },
  $init: function (config) {
    this.$ready.push(this._Init);
  },
  _Init: function () {
  },

}, webix.ui.toolbar);

webix.protoUI({
  name: "Button",
  defaults:{
    on:{
      onItemClick: function(id, e) {
        if (id) {
          callServer("event", { 
            viewId   : this.config.viewId, 
            element  : this.config.name, 
            event    : "onItemClick",
            owner    : this.config.owner,
            arguments: []
          });
        }
      }
    }
  },
  $init: function (config) {
    this.$view.className += " webix_el_button";
    this.$ready.push(this._Init);
  },
  _Init: function () {
  },

}, webix.ui.button);

webix.protoUI({
  name: "Text",
  defaults:{
    on:{
      onChange: function(newv, oldv) {
        callServer("event", { 
          viewId   : this.config.viewId, 
          element  : this.config.name, 
          event    : "onChange",
          arguments: [newv, oldv]
        });
      }
    }
  },
  $init: function (config) {
    this.$view.className += " webix_el_text";
    this.$ready.push(this._Init);
  },
  _Init: function () {
  },

}, webix.ui.text);

webix.protoUI({
  name:"Treetable",
  defaults:{
    scroll: true,
    on:{
      onItemDblClick: function(item, e) {
        const id = item.row;
        if (id) {
          callServer("event", { 
            viewId   : this.config.viewId, 
            element  : this.config.name, 
            event    : "DefaultCmd.Enter",
            owner    : this.config.owner,
            arguments: [id]
          });
        }
      }
    }
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
    const self = this;
    callServer("getData", {
        viewId:  this.config.viewId,
        element: this.config.name
      }, function(err, data) {
        if(err) {
          return console.log("Error on getting data from server");
        }
        self.parse(data);
    });
  }
}, webix.ui.treetable);

webix.protoUI({
  name: "Viewbar",
  defaults:{
    on:{
    }
  },
  addView: function(obj, callback) {
    const id = webix.ui.tabview.prototype.addView.call(this, obj);
    const tab = $$(id);
    tab.show();
    this.removeView("dummy");
    return id;
  }
}, webix.ui.tabview);

webix.protoUI({
  name: "Lookup",
  defaults: {
    readonly: true,
    on: {
      onAfterRender: function() {
        showLookup(this, undefined, undefined, this.$view.children[0], this.config.dataLink);
      }
    }
  },
  $init: function(config) {
    this.$view.className += " webix_el_text";
    this.$ready.push(this._Init);
  },
  _Init: function () {
    if(this.config.instance) {
      this.config.value = this.config.instance.title;
    }
  },
  setValue: function(value) {
    this.config.instance = value;
    this.config.value = value.title;
    this.refresh();
  }
}, webix.ui.text);

function showLookup(view, id, e, box, dataLink) {
  function renderLookupButton() {
    if(box.getElementsByClassName("input_buttons_box").length < 1) {
      var inBox = document.createElement("div");
      box.appendChild(inBox);
      inBox.className = "input_buttons_box";
      var height = box.clientHeight
      inBox.style.height = height + "px";
      inBox.style.backgroundColor = box.style.backgroundColor;
      inBox.style.top = -1*(height - 8) + "px";
      var inButton = document.createElement("div");
      inButton.style.lineHeight = height + "px";
      iButtonClass = "webix_view webix_icon input_button wxi-dots";
      inButton.className = iButtonClass;
      inButton.style.width = height + "px";
      if(view.config.view == "Lookup") {
        inBox.style.height = (height - 8) + "px";
        inBox.style.width = (height - 8) + "px";
        inBox.style.top = -1*(height - 8) + "px";
        inBox.style.right = -1;
        inButton.style.lineHeight = (height - 8) + "px";
        inButton.style.width = (height - 8) + "px";
      }
      inBox.appendChild(inButton);
      inButton.addEventListener("mouseenter", function() {
        inButton.className = iButtonClass + " input_button_hover";
      });
      inButton.addEventListener("mouseleave", function() {
        inButton.className = iButtonClass;
      });
      inButton.addEventListener("click", function() { 
        if(view.config.view == "Lookup") {
          callServer("lookup", { 
            viewId   : view.config.viewId, 
            element  : view.config.name, 
            arguments: [view.config.instance]
          });
        } else { 
          // dataLink.value = view.getItem(id.row);
          // var message = {};
          // message.FormID    = view.config.formID;
          // message.Command   = "Lookup";
          // message.target    = { id: view.config.id, name: view.config.name, columnId: id.column, rowId: id.row, index:  view.getIndexById(id.row) }
          // message.value     = dataLink;
          // ServerCall(message);

          // callServer("lookup", { 
          //   viewId   : this.config.viewId, 
          //   element  : this.config.name, 
          //   arguments: [view.config.dataLink, view.config.instance]
          // });
        }
      }, true);
    }
  }

  renderLookupButton();

  box.addEventListener("mouseenter", function() {
    renderLookupButton();
  });

  box.addEventListener("mouseleave", function(e) {
    if(box.getElementsByClassName("input_buttons_box").length > 0) {
      var inBox = box.getElementsByClassName("input_buttons_box")[0];
      inBox.remove();
    }
  });
}