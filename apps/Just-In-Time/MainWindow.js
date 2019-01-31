/* globals Tools Application View */
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