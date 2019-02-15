/* globals Tools Application View */
const  path = require('path');

View.onInit = function(callback) {

  Log.debug("Window initialization");
  callback();
}


View.onLoad = function(params) {
  View.Sidebar.add(
    { 
      id: Tools.SID(), 
      value: "Addresses", 
      command: "openForm", 
      cube: "Enterprise", 
      class: "Catalogs", 
      type: "Addresses"  
    }
  );

  const p =require.resolve("c:\\ITProjects\\cubismo\\core\\UI\\DefaultViews\\Catalogs.Views.List.Config.js");
  if(require.cache[p]) {
    delete require.cache[p];
  }
  
  Application.Enterprise.Catalogs.Addresses.show({
    options: {
      purpose: "select",
      onlyFolders: true
    }
  });
}

View.Sidebar_onItemClick = function(item) {
  Application[item.cube][item.class][item.type].show();
}