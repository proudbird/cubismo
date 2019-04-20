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
    webix.message(this.config.id);
    const video = document.querySelector("video");//getElementById(this.config.id); //this.$view;
    video.srcObject = stream;
    video.onloadedmetadata = function(e) {
      video.play();
      video.muted = true;
    }
  }
}, webix.ui.video);
