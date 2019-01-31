/* globals __ROOT Tools Platform Sessions Token*/
var fs      = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');
var express = require('express');
var router  = module.exports = express();
var os = require("os");

// var router = express();

var bodyParser   = require('body-parser');
const fileUpload = require('express-fileupload');
router.use(bodyParser.json()); // support json encoded bodies
router.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
router.use(fileUpload());

router.get('/:app', function(req, res, next) {
  var AppName = req.params.app;
  if (AppName != 'favicon.ico') {
    var View = fs.readFileSync(__ROOT + '/Window.html', 'UTF-8');
    res.send(View.replace(/AppName/g, AppName));
  }
});

router.get('/favicon.ico', function(req, res, next) {
  console.log('favicon');
});

// Loading views
router.get('/:app/views/:view', function(req, res, next) {
  var AppName = req.params.app;
if (req.params.view == 'Window') {
  var View = Platform.applications[AppName].show();
    var ViewConfig = JSON.stringify(View, function(key, value) {
        if (typeof value === "function") {
          return "/Function(" + value.toString() + ")/";
        }
        return value;
      });
    res.send(ViewConfig);
  }
});

router.get('/:app/window', function(req, res, next) {
  var AppName = req.params.app;
  //@TODO
  req.query.appID = AppName;
  //
  if (!Platform.applications[req.query.appID]) {
    //Platform.Applications.Init(AppName, req.query.appID);
  }
  var View = Platform.applications[req.query.appID].show();
    var ViewConfig = JSON.stringify(View, function(key, value) {
        if (typeof value === "function") {
          return "/Function(" + value.toString() + ")/";
        }
        return value;
      });
    res.send(ViewConfig);

});

router.post('/:app/login', function(req, res) {
  if(!req.body)
    res.status(400).send('Error on logong');
  if(!req.body.login)
    res.status(400).send('Login is required');
  if(!req.body.password)
    res.status(400).send('Password is required');
  
  var Application = Platform.Applications[req.body.appID];
  if(!Platform.Applications[req.body.appID]) {
    Platform.Applications.Init(req.params.app, req.body.appID);
    var Application = Platform.Applications[req.body.appID];
  }
  
  var Users = Application.DBConnection.models.sysUsers;
  Users.findOne({where: { Login: req.body.login }}).then(User => {
    if(User) {
      if(User.Password === req.body.password) {
        Token = '15151651651';
        res.status(200).send({Token: Token});
        //Application.User = Application.Users[req.body.login];
      } else {
        res.status(400).send('Wrong password!');
      }
    } else {
    res.status(400).send('Wrong username!');
    }
  })
});

router.get('/:app/files', function(req, res, next) {
    // console.log(req.query.fileName);
    res.sendFile(req.query.fileName);
});

router.get('/files/js/:file', function(req, res, next) {
    res.sendFile(__ROOT + '/client/js/'+req.params.file);
});

router.get('/files/css/:file', function(req, res, next) {
    res.sendFile(__ROOT + '/client/css/'+req.params.file);
});

router.get('/files/img/:file', function(req, res, next) {
  res.sendFile(__ROOT + '/client/img/'+req.params.file);
});

router.get('/files/audio/:file', function(req, res, next) {
  res.sendFile(__ROOT + '/client/audio/'+req.params.file);
});

router.get('/fonts/:file', function(req, res, next) {
    res.sendFile(__ROOT + '/client/fonts/'+req.params.file);
});

// Getting data for UI components
router.get('/:app/data', function(req, res) {
  //var dataSchema = JSON.parse(req.query.dataSchema);

  var Application = Platform.Applications[req.query.appID];
  if(Application) {
    process.env.Application = req.query.appID;
    const filter = req.query.filter;
    if(!filter) {
      Application.DB.GetData(req.query.formID, req.query.viewName, req.query.parent, function(error, data){
        res.send(data);  
        data = null;
      });
    } else {
      if(!filter["value"]) {
        res.send(null); 
      } else {
        Application.DB.GetSuggest(req.query.formID, req.query.viewName, req.query.filter, function(error, data){
          res.send(data);  
          data = null;
        });
      }
    }
  }
});

// Getting data for UI components
router.get('/:app/tempData', function(req, res) {
  var dataId = req.query.dataID;
  var Application = Platform.Applications[req.query.appID];
  if(Application) {
    res.send(Globals[dataId]);  
  }
});

router.post('/:app/upload', function(req, res) {
  if (!req.files)
    return res.status(400).send('No files were uploaded.');

  var file = req.files.upload;
  var fileID = Tools.SID();
  
  var TempDir = os.tmpdir();
  var FullFileName = TempDir + '/' + fileID + '/' + req.files.upload.name;
  
  if (!fs.existsSync(FullFileName)){
      mkdirp(path.dirname(FullFileName), function (err) {
        if (err) return console.log(err);
          file.mv(FullFileName, function(err) {
             if (err)
               return res.status(500).send(err);
            res.send({"status":"server", "sname": fileID, "fullPathFile": FullFileName});
          });
      })
  }
});