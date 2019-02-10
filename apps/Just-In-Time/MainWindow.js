/* globals Tools Application View */
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
}

View.Sidebar_onItemClick = function(item) {
  Application[item.cube][item.class][item.type].show();
}