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
      },
      // onBeforeAdd: function(id, obj, index) {
      //   let parentId;
      //   if(obj.items && obj.items.length) {
      //     //const items = clone(obj.items);
      //     //delete obj.items;
      //     parentId = webix.TreeStore.add.call(this, obj, index);
      //     items.forEach(item => {
      //       webix.TreeStore.add.call(this, item, 0, parentId)
      //     });
      //   } else {
      //     parentId = webix.TreeStore.add.call(this, obj, index);
      //   }
      //   return false;
      // }
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
    if(value) {
      this.config.instance = value;
      this.config.value = value.title;
    } else {
      delete this.config.instance.title;
      delete this.config.instance.id;
      this.config.value = "";
    }
    this.refresh();
  }
}, webix.ui.text);

function showLookup(view, id, e, box, dataLink) {
  function addButton(inBox, inButtonClass, height, right, action) {
    var inButton = document.createElement("div");
    inButton.style.lineHeight = height + "px";
    inButton.className = inButtonClass;
    inButton.style.width = height + "px";
    if(view.config.view == "Lookup") {
      inBox.style.height = (height - 8) + "px";
      //inBox.style.width = (height - 8) + "px";
      inBox.style.top = -1*(height - 8) + "px";
      inBox.style.right = right;
      inButton.style.lineHeight = (height - 8) + "px";
      inButton.style.width = (height - 8) + "px";
    }
    inBox.appendChild(inButton);
    inButton.addEventListener("mouseenter", function() {
      inButton.className = inButtonClass + " input_button_hover";
    });
    inButton.addEventListener("mouseleave", function() {
      inButton.className = inButtonClass;
    });
    inButton.addEventListener("click", function() { 
      if(view.config.view == "Lookup") {
        callServer("lookup", { 
          action   : action,
          viewId   : view.config.viewId, 
          element  : view.config.name, 
          arguments: [view.config.instance]
        });
        if(action === "clear") {
          view.setValue(null);
        }
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
  function renderLookupButton() {
    if(box.getElementsByClassName("input_buttons_box").length < 1) {
      var inBox = document.createElement("div");
      box.appendChild(inBox);
      inBox.className = "input_buttons_box";
      var height = box.clientHeight
      inBox.style.height = height + "px";
      inBox.style.backgroundColor = box.style.backgroundColor;
      inBox.style.top = -1*(height - 8) + "px";
      inButtonClass = "webix_view webix_icon input_button wxi-dots";
      addButton(inBox, inButtonClass, height, -1, "select");
      inButtonClass = "webix_view webix_icon input_button wxi-close";
      addButton(inBox, inButtonClass, height, -2 - (height - 8), "clear");
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

webix.DataDriver.json = webix.extend({
  parseDates:true,
  toObject:function(data){
		if (!data) return null;
		if (typeof data == "string"){
			try{
				if (this.parseDates){
					var isodate = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d{3})?Z/;
					data = JSON.parse(data, function(key, value){
						if (typeof value == "string"){
							if (isodate.test(value)) {
                return new Date(value);
              }
						}
						return value;
					});
				} else {
					data =JSON.parse(data);
				}
			} catch(e){
				webix.log(e);
				webix.log(data);
				webix.assert_error("Invalid JSON data for parsing");
				return null;
			}
		}
		return data;
	}
}, webix.DataDriver.json);

webix.protoUI({
  name:"Datatable",
  defaults:{
    scroll: true,
    on:{
      onSelectChange: function() {

      },
      onItemDblClick: function(item) {

      },
      onItemClick: function(id, e, node) {

      },
      onBeforeEditStart: function(item) {

      },
      onAfterEditStart: function(item) {
        const value = this.getText(item.row, item.column);
        const editor = this.getEditor(item.row, item.column);
        editor.setValue(value);
      },
      onAfterEditStop: function(state, editor, changed) {
        const item = this.getItem(editor.row);
        // TODO: there may be errors
        item.value[editor.column] = state.value;
        callServer("event", { 
          viewId   : this.config.viewId, 
          element  : this.config.name, 
          event    : "onItemChange",
          arguments: [editor.column, this.getIndexById(editor.row), this.getItem(editor.row), state.value, state.old]
        });
      },
      onBeforeLoad: function() {
      },
      onAfterLoad: function() {
      }
    }
  },
  $init: function (config) {
    config.columns.forEach(column => {
      column.template = function(row) {
        const value = row.value[column.id];
        if(value && typeof value === "object") {
          return  value.title;
        } else {
          return  value || "";
        }
      }
    })
    this.$ready.push(this._Init);
    this.$ready.unshift(this._after_init_call);
  },
  _after_init_call: function () {

  },
  _Init: function () {

  },
  focus: function(){
		webix.UIManager.setFocus(this);
	}
}, webix.ui.datatable);
