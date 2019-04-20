(function () {
  'use strict';

  /* globals $$ */
  window.applicationId = window.location.pathname.replace("/", "") || "index";
  let reconection;
  const serverUrl = window.location.hostname + ":21021";
  const server = io(serverUrl, {
    query: {
      applicationId: window.applicationId
    }
  });

  function reconnect() {
    if (!server.connected) {
      server.connect({
        query: {
          applicationId: window.applicationId
        }
      });
    } else {
      clearInterval(reconection);
    }
  }

  server.on('connect', function (response) {
    console.log("server is connected");
  });
  server.on('disconnect', function () {
    reconection = setInterval(reconnect, 1000);
  });
  server.on("window", function (config) {
    webix.ui(JSON.parse(config, function (key, value) {
      if (typeof value === "string" && value.startsWith("/Function(") && value.endsWith(")/")) {
        value = value.substring(10, value.length - 2);
        return eval("(" + value + ")");
      }

      return value;
    }));
  });
  server.on("ShowModalWindow", function (config, callback) {
    const options = {
      title: config.title,
      body: config,
      width: 600
    };
    const viewId = showModalWindow(options);
    callback(viewId);
  });
  server.on("CloseModalWindow", function (id, callback) {
    try {
      $$(id).close();
      callback({});
    } catch (err) {
      callback({
        error: err
      });
    }
  });
  server.on("directive", function (message, callback) {
    const elementId = message.elementId;
    const element = $$(elementId);

    if (!element) {
      callback({
        err: "No such element with ID <" + elementId + ">"
      });
    }

    const method = element[message.directive];

    if (!method) {
      callback({
        err: "No such method <" + message.directive + "> for element with ID <" + elementId + ">"
      });
    }

    const _arguments = message.arguments || [];

    if (message.directive === "setValue") {
      element.itWasChangerdOnServer = true;
    }

    const result = element[message.directive](_arguments[0], _arguments[1], _arguments[2], _arguments[3], _arguments[4]);
    callback({
      result: result
    });
  });
  server.on("dataUpdate", function (message, callback) {
    const elementId = message.elementId;
    const element = $$(elementId);

    if (!element) {
      callback({
        err: "No such element with ID <" + elementId + ">"
      });
    }

    const _arguments = message.arguments || [];

    let result;

    if (message.directive === "create") {
      result = element.add(_arguments[0]); // sort
    } else if (message.directive === "update") {
      const item = _arguments[0];
      result = element.updateItem(item.id, item);
      const dataItem = element.getItem(item.id);

      if (dataItem.$parent != item.Parent.id) {
        element.move(item.id, undefined, undefined, {
          parent: item.Parent.id
        });
      } // sort

    } else if (message.directive === "delete") {
      const item = _arguments[0];
      result = element.remove(item.id);
    }

    callback({
      result: result
    });
  });

  window.callServer = function callServer(action, message, callback) {
    if (window.clientId) {
      message.clientId = window.clientId;
    }

    message.applicationId = window.applicationId;
    message.windowId = window.windowId;

    if (!message.lang) {
      message.lang = window.lang;
    }

    server.emit(action, message, function (err, result) {
      if (callback) {
        callback(err, result);
      }
    });
  };

  window.addEventListener("beforeunload", function (event) {
    server.emit("beforeunload", {
      applicationId: window.applicationId,
      windowId: window.windowId
    });
    event.returnValue = '';
  });

  /* globals webix $$ */
  window._hidden_on_resize = [];
  let lang = navigator.language || navigator.userLanguage;
  window.lang = lang.slice(0, lang.search("-"));
  webix.Date.startOnMonday = true;

  function showModalWindow$1(options, onClose) {
    const id = webix.uid();
    webix.ui({
      view: "window",
      id: id,
      head: {
        view: "toolbar",
        margin: -4,
        cols: [{
          view: "label",
          label: options.title
        }, {}, {
          view: "icon",
          icon: "wxi-close",
          click: function () {
            if (onClose) {
              onClose(null);
            }

            $$(id).close();
          }
        }]
      },
      modal: true,
      move: true,
      position: "center",
      width: options.width,
      height: options.height,
      body: options.body
    }).show();
    return id;
  }

  function initInputButtons(box, boxClass, difference, buttons) {
    //const box = node;
    function addInputButton(inBox, inButtonClass, height, right, action) {
      var inButton = document.createElement("div");
      inButton.style.lineHeight = height + "px";
      inButton.className = inButtonClass;
      inButton.style.width = height + "px";
      inBox.style.height = height - (difference + 1) + "px";
      inBox.style.top = -1 * (height - difference) + "px";
      inBox.style.right = right;
      inButton.style.lineHeight = height - difference + "px";
      inButton.style.width = height - difference + "px";
      inBox.appendChild(inButton);
      inButton.addEventListener("mouseenter", function () {
        inButton.className = inButtonClass + " input_button_hover";
      });
      inButton.addEventListener("mouseleave", function () {
        inButton.className = inButtonClass;
      });
      inButton.addEventListener("click", function () {
        action();
      }, true);
    }

    function renderInputButtonsBox(buttons) {
      if (box.getElementsByClassName(boxClass).length < 1) {
        var inBox = document.createElement("div");
        box.appendChild(inBox);
        inBox.className = boxClass;
        var height = box.clientHeight;
        inBox.style.height = height + "px";
        inBox.style.backgroundColor = box.style.backgroundColor;
        inBox.style.top = -1 * (height - difference) + "px";
        let right = -1;
        buttons.forEach(button => {
          addInputButton(inBox, button.class, height, right, button.action);
          right = right - 1 - (height - difference);
        });
      }
    }

    box.addEventListener("mouseenter", function () {
      renderInputButtonsBox(buttons);
    });
    box.addEventListener("mouseleave", function (e) {
      if (box.getElementsByClassName(boxClass).length > 0) {
        const inBox = box.getElementsByClassName(boxClass)[0];
        inBox.remove();
      }
    });
  }

  function getLocal(message, callback) {
    callServer("getLocal", message, function (err, result) {
      if (err) {
        return webix.alert(err);
      }

      callback(result);
    });
  }

  function localize(params, langs, callback) {
    let windowId = null;
    const rows = [];
    langs.forEach(lang => {
      params.lang = lang;
      getLocal(params, function (value) {
        $$(params.attribute + "_" + lang).setValue(value);
      });
      rows.push({
        view: "text",
        id: params.attribute + "_" + lang,
        viewId: params.viewId,
        label: lang,
        labelWidth: 50
      });
    });
    const buttons = {
      cols: [{}, {
        view: "Button",
        viewId: params.viewId,
        maxWidth: 200,
        value: "OK",
        click: function () {
          onClose($$(windowId));
        }
      }, {
        view: "Button",
        viewId: params.viewId,
        maxWidth: 200,
        value: "Cancel",
        click: function () {
          onClose(null);
          $$(windowId).close();
        }
      }]
    };
    rows.push(buttons);
    const viewConfig = {
      rows: rows
    };
    const options = {
      title: "Translations of: " + params.attribute,
      body: viewConfig,
      width: 600
    };

    function onClose(view) {
      if (view) {
        const translations = [];
        langs.forEach(lang => {
          const value = $$(params.attribute + "_" + lang).getValue();
          translations.push({
            attribute: params.attribute,
            fieldId: params.fieldId,
            lang: lang,
            value: value
          });

          if (lang === window.lang) {
            callback(value);
          }
        });
        $$(windowId).close();
        callServer("localaze", {
          viewId: params.viewId,
          element: params.attribute,
          collection: params.collection,
          index: params.index,
          translations: translations
        });
      }
    }

    windowId = showModalWindow$1(options, onClose);
  }

  webix.protoUI({
    name: "MainWindow",
    $init: function (config) {
      this.$ready.push(this._Init);
    },
    _Init: function () {
      window.windowId = this.config.id;
      callServer("event", {
        viewId: this.config.id,
        element: this.config.name,
        event: "onLoad"
      });
    }
  }, webix.ui.layout); // webix.protoUI({
  //   name: "View",
  //   $init: function (config) {
  //     this.$ready.push(this._Init);
  //   },
  //   _Init: function () {
  //     callServer("event", {
  //       viewId: this.config.viewId,
  //       element: this.config.name,
  //       event: "onLoad"
  //     });
  //   }
  // }, webix.ui.layout);

  webix.protoUI({
    name: "Label",
    $init: function (config) {
      this.$ready.push(this._Init);
    },
    _Init: function () {
      if (this.config.value) {
        this.setValue(this.config.value);
      }
    }
  }, webix.ui.label);
  webix.protoUI({
    name: "sidebar",
    defaults: {
      on: {
        onItemClick: function (id) {
          if (id) {
            callServer("event", {
              viewId: this.config.viewId,
              element: this.config.name,
              event: "onItemClick",
              arguments: [this.getItem(id)]
            });
          }
        } // onBeforeAdd: function(id, obj, index) {
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
    defaults: {
      on: {}
    },
    $init: function (config) {
      this.$ready.push(this._Init);
    },
    _Init: function () {}
  }, webix.ui.toolbar);
  webix.protoUI({
    name: "Button",
    defaults: {
      on: {
        onItemClick: function (id, e) {
          if (id) {
            callServer("event", {
              viewId: this.config.viewId,
              element: this.config.name,
              event: "onItemClick",
              owner: this.config.owner,
              arguments: [this.config.value]
            });
          }
        }
      }
    },
    $init: function (config) {
      this.$view.className += " webix_el_button";
      this.$ready.push(this._Init);
    },
    _Init: function () {},
    changeStyle: function (oldClass, newClass) {
      webix.html.removeCss(this.$view, oldClass);
      webix.html.addCss(this.$view, newClass);
      this.refresh();
    }
  }, webix.ui.button);
  webix.protoUI({
    name: "Text",
    defaults: {
      on: {
        onAfterRender: function () {
          const self = this;
          const buttons = [];

          if (this.config.langs && this.config.langs.length) {
            const cssClass = "webix_view input_button fa-icon fa-globe";
            buttons.push({
              class: cssClass,
              action: function () {
                const params = {
                  viewId: self.config.viewId,
                  attribute: self.config.name
                };
                localize(params, self.config.langs, function (value) {
                  self.setValue(value);
                });
              }
            });
          }

          if (buttons.length) {
            initInputButtons(this.$view.children[0], "input_buttons_box", 8, buttons);
          }

          callServer("event", {
            viewId: this.config.viewId,
            element: this.config.name,
            event: "onAfterRender",
            arguments: []
          });
        },
        onChange: function (newv, oldv) {
          if (this.itWasChangerdOnServer) {
            this.itWasChangerdOnServer = false;
          } else {
            callServer("event", {
              viewId: this.config.viewId,
              element: this.config.name,
              event: "onChange",
              arguments: [newv, oldv]
            });
          }
        },
        onFocus: function (view) {
          callServer("event", {
            viewId: this.config.viewId,
            element: this.config.name,
            event: "onFocus",
            arguments: []
          });
        }
      }
    },
    $init: function (config) {
      this.$view.className += " webix_el_text";
      this.$ready.push(this._Init);
    },
    _Init: function () {}
  }, webix.ui.text);
  webix.protoUI({
    name: "Checkbox",
    $init: function (config) {
      this.$view.className += " webix_el_checkbox";
    },
    defaults: {
      on: {
        onChange: function (newv, oldv) {
          if (this.itWasChangerdOnServer) {
            this.itWasChangerdOnServer = false;
          } else {
            callServer("event", {
              viewId: this.config.viewId,
              element: this.config.name,
              event: "onChange",
              arguments: [!!newv, !!oldv]
            });
          }
        }
      }
    }
  }, webix.ui.checkbox);
  webix.protoUI({
    name: "Icon",
    $init: function (config) {
      this.$view.className += " webix_el_checkbox";
    },
    defaults: {
      on: {
        onItemClick: function () {
          callServer("event", {
            viewId: this.config.viewId,
            element: this.config.name,
            event: "onItemClick",
            arguments: []
          });
        }
      }
    }
  }, webix.ui.icon);
  webix.protoUI({
    name: "Carousel",
    defaults: {
      on: {
        onShow: function (id) {
          if (id) {
            callServer("event", {
              viewId: this.config.viewId,
              element: this.config.name,
              event: "onShow",
              arguments: [id]
            });
          }
        }
      }
    },
    $init: function (config) {
      this.$ready.push(this._Init);
    },
    _Init: function () {
      var self = this;
      const event = webix.env.isIE8 ? "mousewheel" : "wheel";

      if (this.$view.addEventListener) {
        this.$view.addEventListener(event, function (e) {
          self._on_wheel(e, self);
        }, {
          bind: this,
          passive: false
        });
      } else if (this.$view.attachEvent) ;
    },
    _on_wheel: function _on_wheel(e, self) {
      var dir = 0;

      if (e.deltaX > 0) {
        dir = 1;
      } else if (e.deltaX < 0) {
        dir = -1;
      }

      if (e.deltaY > 0) {
        dir = 1;
      } else if (e.deltaY < 0) {
        dir = -1;
      }

      if (dir) {
        const length = self._cells.length;
        let index = self.getActiveIndex();
        index = index + dir;

        if (index < 0) {
          index = 0;
        } else if (index > length - 1) {
          index = length - 1;
        }

        if (self.setActiveIndex(index)) {
          return preventEvent(e);
        }
      }
    }
  }, webix.ui.carousel);
  webix.protoUI({
    name: "List",
    defaults: {
      on: {
        onSelectChange: function (id) {
          if (id) {
            callServer("event", {
              viewId: this.config.viewId,
              element: this.config.name,
              event: "onSelectChange",
              arguments: [this.getItem(id)]
            });
          }
        },
        onItemDblClick: function (id) {
        },
        onAfterDelete: function (id) {}
      }
    },
    selectByIndex: function selectByIndex(index) {
      this.select(this.getIdByIndex(index));
    }
  }, webix.ui.list);
  webix.protoUI({
    name: "Treetable",
    defaults: {
      scroll: true,
      on: {
        onItemDblClick: function (item, e) {
          const id = item.row;

          if (id) {
            callServer("event", {
              viewId: this.config.viewId,
              element: this.config.name,
              event: "DefaultCmd.Enter",
              owner: this.config.owner,
              arguments: [id]
            });
          }
        }
      }
    },
    $init: function (config) {
      this.$ready.push(this._Init);
      this.$ready.unshift(this._after_init_call);
      //   folder: function (obj, type) {
      //     if(!self || !self.isBranchOpen) {
      //       return;
      //     }
      //     const collapsed = self.isBranchOpen(obj.id);
      //     if (obj.isFolder) {
      //       if (collapsed) {
      //         return "<span class='fa-icon fa-folder-open'>&nbsp;</span>";
      //       } else {
      //         return "<span class='fa-icon fa-folder'>&nbsp;</span>";
      //       }
      //     } else {
      //       let hasChildes = false;
      //       if(self.getFirstChildId) {
      //         hasChildes = !!self.getFirstChildId(obj.id);
      //       }
      //       if(hasChildes) {
      //         return "<span class='fa-icon fa-equals'>&nbsp;</span>";
      //       } else {
      //         return "<span class='fa-icon fa-minus'>&nbsp;</span>";
      //       }
      //     }
      //   }
      // }
    },
    _after_init_call: function () {},
    _Init: function () {
      this.getData();
    },
    getData: function () {
      const self = this;
      callServer("getData", {
        viewId: this.config.viewId,
        element: this.config.name
      }, function (err, data) {
        if (err) {
          return console.log("Error on getting data from server");
        }

        self.parse(data);
        callServer("event", {
          viewId: self.config.viewId,
          element: self.config.name,
          event: "DefaultCmd.OnAfterLoad",
          arguments: []
        });
      });
    }
  }, webix.ui.treetable);
  webix.protoUI({
    name: "Viewbar",
    defaults: {
      on: {}
    },
    addView: function (obj, callback) {
      const id = webix.ui.tabview.prototype.addView.call(this, obj);
      const tab = $$(id);
      tab.show();
      this.removeView("dummy");
      return id;
    },
    $init: function (config) {
      this.$ready.push(this._Init);
    },
    _Init: function () {
      const tabbar = this.getTabbar();

      if (this.config.id != "dummy") {
        tabbar.attachEvent("onBeforeTabClose", function (id, e) {
          callServer("onBeforeViewClose", {
            viewId: id,
            arguments: [id]
          });
          return false;
        });
      }
    }
  }, webix.ui.tabview);
  webix.protoUI({
    name: "Fieldset",
    defaults: {
      on: {}
    }
  }, webix.ui.fieldset);
  webix.protoUI({
    name: "Group",
    defaults: {
      responsive: true,
      on: {
        onResize: function () {}
      }
    },
    $init: function (config) {
      this.$ready.push(this._Init);
    },
    _Init: function () {},
    $setSize: function (x, y) {
      if (this.config.adaptive) {
        const adaptiveWidths = this.config.adaptive.width;

        if (adaptiveWidths) {
          for (let key in adaptiveWidths) {
            const adaptiveWidth = adaptiveWidths[key];

            if (window.innerWidth < parseInt(key) && x > adaptiveWidth) {
              this.define("width", adaptiveWidth);

              if (adaptiveWidth === 0) {
                window._hidden_on_resize.push(this);

                this.hide();
                break;
              }
            }
          }
        }
      }

      webix.ui.layout.prototype.$setSize.call(this, x, y);
    }
  }, webix.ui.layout);

  window._check_hidden = function () {
    // TODO needs to be rebuild
    const hidden = window._hidden_on_resize;

    if (hidden && hidden.length) {
      for (var i = 0; i < hidden.length; i++) {
        const cell = hidden[i];

        if (cell.config.adaptive && cell.config.adaptive.width) {
          for (let limit in cell.config.adaptive.width) {
            if (window.innerWidth >= parseInt(limit)) {
              hidden.splice(i, 1);
              cell.show();
              cell.define("width", cell.config.adaptive.width[limit]);
            }
          }
        }
      }
    }
  };

  window.addEventListener("resize", window._check_hidden);
  webix.protoUI({
    name: "Lookup",
    defaults: {
      readonly: true,
      on: {
        onAfterRender: function () {
          const self = this;
          const buttons = []; //if(this.config.langs && this.config.langs.length) {

          let cssClass = "webix_view input_button fa-icon fa-ellipsis-h";
          buttons.push({
            class: cssClass,
            action: function () {
              callServer("lookup", {
                action: "select",
                viewId: self.config.viewId,
                element: self.config.name,
                arguments: [self.config.instance]
              });
            }
          });
          cssClass = "webix_view input_button fa-icon fa-times";
          buttons.push({
            class: cssClass,
            action: function () {
              self.setValue(null);
              callServer("lookup", {
                action: "clear",
                viewId: self.config.viewId,
                element: self.config.name,
                arguments: [null]
              });
            }
          }); //}

          if (buttons.length) {
            initInputButtons(this.$view.children[0], "input_buttons_box", 8, buttons);
          }
        }
      }
    },
    $init: function (config) {
      this.$view.className += " webix_el_text lookup";
      this.$ready.push(this._Init);
    },
    _Init: function () {
      if (this.config.instance) {
        this.config.value = this.config.instance.presentation;
      }
    },
    setValue: function (value) {
      if (value) {
        this.config.instance = value;
        this.config.value = value.presentation;
      } else {
        delete this.config.instance.presentation;
        delete this.config.instance.id;
        this.config.value = "";
      }

      this.refresh();
    }
  }, webix.ui.text);

  webix.DataDriver.json = webix.extend({
    parseDates: true,
    toObject: function (data) {
      if (!data) return null;

      if (typeof data == "string") {
        try {
          if (this.parseDates) {
            var isodate = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d{3})?Z/;
            data = JSON.parse(data, function (key, value) {
              if (typeof value == "string") {
                if (isodate.test(value)) {
                  return new Date(value);
                }
              }

              return value;
            });
          } else {
            data = JSON.parse(data);
          }
        } catch (e) {
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
    name: "Datatable",
    defaults: {
      scroll: true,
      on: {
        onSelectChange: function () {},
        onItemDblClick: function (item) {},
        onItemClick: function (cell) {
          const self = this;

          function main() {
            const node = self.getItemNode({
              row: cell.row,
              column: cell.column
            });
            const buttons = [];
            const columns = self.config.columns;
            let column;
            columns.forEach(col => {
              if (col.id === cell.column) {
                column = col;

                if (column.langs && column.langs.length) {
                  const cssClass = "webix_view input_button fa-icon fa-globe";
                  buttons.push({
                    class: cssClass,
                    action: function () {
                      const params = {
                        viewId: self.config.viewId,
                        collection: self.config.dataLink,
                        index: self.getIndexById(cell.row),
                        attribute: cell.column
                      };
                      localize(params, column.langs, function (value) {
                        record = self.getItem(cell.row);
                        record[cell.column] = value;
                        self.updateItem(cell.row, record);
                        setTimeout(main, 10);
                      });
                    }
                  });
                } else if (column.editor === "lookup") {
                  let cssClass = "webix_view input_button fa-icon fa-ellipsis-h";
                  buttons.push({
                    class: cssClass,
                    action: function () {
                      callServer("lookup", {
                        action: "select",
                        viewId: self.config.viewId,
                        element: self.config.name,
                        collection: self.config.dataLink,
                        index: self.getIndexById(cell.row),
                        itemId: cell.row,
                        property: cell.column,
                        arguments: [self.getItem(cell.row)[cell.column]]
                      });
                    }
                  });
                  cssClass = "webix_view input_button fa-icon fa-times";
                  buttons.push({
                    class: cssClass,
                    action: function () {
                      self.setValue(null);
                      callServer("lookup", {
                        action: "clear",
                        viewId: self.config.viewId,
                        element: self.config.name,
                        collection: self.config.dataLink,
                        index: self.getIndexById(cell.row),
                        property: cell.column,
                        arguments: [null]
                      });
                    }
                  });
                }

                if (buttons.length) {
                  initInputButtons(node, "input_buttons_box_cell", 0, buttons);
                }
              }
            });
          }

          setTimeout(main, 10);
          callServer("event", {
            viewId: this.config.viewId,
            element: this.config.name,
            event: "onItemClick",
            arguments: []
          });
        },
        onAfterEditStart: function (item) {
          const value = this.getText(item.row, item.column);
          const editor = this.getEditor(item.row, item.column);
          editor.setValue(value);
        },
        onAfterEditStop: function (state, editor, changed) {
          const item = this.getItem(editor.row); // TODO: there may be errors

          if (item.value) {
            item.value[editor.column] = state.value;
          }

          callServer("event", {
            viewId: this.config.viewId,
            element: this.config.name,
            event: "onItemChange",
            arguments: [editor.column, this.getIndexById(editor.row), this.getItem(editor.row), state.value, state.old]
          });
        },
        onBeforeLoad: function () {},
        onAfterLoad: function () {}
      }
    },
    $init: function (config) {
      config.columns.forEach(column => {
        column.template = function (row) {
          const value = row[column.id];

          if (value && typeof value === "object") {
            return value.presentation;
          } else {
            return value || "";
          }
        };
      });
      this.$ready.push(this._Init);
      this.$ready.unshift(this._after_init_call);
    },
    _after_init_call: function () {},
    _Init: function () {},
    focus: function () {
      webix.UIManager.setFocus(this);
    }
  }, webix.ui.datatable);
  webix.editors.lang = webix.extend({
    render: function () {
      const html = create("div", {
        "class": "webix_dt_editor"
      }, "<input type='text' aria-label='" + getLabel(this.config) + "'>");
      return html;
    }
  }, webix.editors.text);
  async function getMedia(constraints) {
    let stream = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      return stream;
    } catch (err) {
      webix.alert("Video is unawailable!");
      return null;
    }
  }

  webix.protoUI({
    name: "View",
    $init: function (config) {
      this.$ready.push(this._Init);
    },
    _Init: function () {
      callServer("event", {
        viewId: this.config.viewId,
        element: this.config.name,
        event: "onLoad"
      });
    }
  }, webix.ui.layout);

  webix.protoUI({
    name: "video",
    $init: function (config) {
      this.$ready.push(this._Init);
      const constraints = {};

      if (config.userMedia) {
        constraints.video = true;
        constraints.audio = true;
        this.initStream(constraints);
      }
    },
    _Init: function () {},
    initStream: async function (constraints) {
      const stream = await getMedia(constraints);
      this.define("src", stream);
    }
  }, webix.ui.video);

}());
