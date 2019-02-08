/* globals Tools Application View */
View.onInit = function(callback) {

  Log.debug("Window initialization");
  callback();
}


View.onLoad = function(params) {
  View.Sidebar.add(
    { 
      id: Tools.SID(), 
      value: "Products", 
      command: "openForm", 
      cube: "Goods", 
      class: "Catalogs", 
      type: "Products"  
    }
  );
}

View.sidebar_onItemClick = function(item) {
  console.log(item);
}