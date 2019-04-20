import {getMedia} from "../ui/utils"

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