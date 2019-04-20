import {getMedia} from "../ui/utils"

webix.protoUI({
  name: "video",
  $init: function (config) {
    this.$ready.push(this._Init);
    const constraints = {};
    if(config.userMedia) {
      constraints.video = true;
      constraints.audio = true;
      this.initStream(constraints);
    }
  },
  _Init: function () {

  },
  initStream: async function(constraints) {
    const stream = await getMedia(constraints);
    this.define("src", stream);
  }
}, webix.ui.video);