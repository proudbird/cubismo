const os      = require("os");
const fs      = require('fs');
const mkdirp  = require('mkdirp');
const path    = require('path');
const express = require('express');
const router  = express();

const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');

module.exports.init = function() {

  router.use(express.static(path.join(__dirname, "../client")));
  router.use(bodyParser.json());
  router.use(bodyParser.urlencoded({ extended: true }));
  router.use(fileUpload());
  
  router.get('/:applicationId', function(req, res, next) {
    function sendWindow() {
      const view = fs.readFileSync(path.join(__dirname, '../client/window.html'), 'UTF-8');
      res.send(view);
    }
  
    const applicationId = req.params.applicationId;
    const application = Platform.applications[applicationId];
    if(!application) {
      Platform.initApplication("Just-In-Time")
      .then((application) => {
        sendWindow();
      })
      .catch(err => {
        console.log(err);
      })
    } else {
      sendWindow();
    }
  });
  
  return router;
}