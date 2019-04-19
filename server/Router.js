"use strict";

const os = require("os");
const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');
const express = require('express');
const router = express();

const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');

module.exports.init = function (platform) {

  router.use(express.static(path.join(__dirname, "../client")));
  router.use(bodyParser.json());
  router.use(bodyParser.urlencoded({
    extended: true
  }));
  router.use(fileUpload());

  router.get('/:applicationId', function (req, res, next) {

    function sendWindow() {
      Log.debug("Sending window congiguration")
      const view = fs.readFileSync(path.join(__dirname, '../client/window.html'), 'UTF-8');
      res.send(view);
    }

    const applicationId = req.params.applicationId;
    const application = platform.applications[applicationId];
    if (!application) {
      Log.debug(`Application <${applicationId}> is not running. Starting...`)
      platform.initApplication("Just-In-Time")
        .then(() => {
          Log.debug(`Application <${applicationId}> has been started`)
          sendWindow();
        })
        .catch(err => {
          Log.error(`Unsuccess attempt to run application <${applicationId}>`, err);
        })
    } else {
      Log.debug(`Application <${applicationId}> is running`)
      sendWindow();
    }
  });

  return router;
}