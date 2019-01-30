/* globals Tools Application ID ContainerID webix*/
var UploaderListID = Tools.SID();
module.exports.Init = function (Master) {
  return {
    view: "Form",
    id: ID,
    containerID: ContainerID,
    name: "Form",
    header: 'Attributes',
    rows: [
      {
        id: Tools.SID(),
        formID: ID,
        view: "Menu",
        name: "Menu",
        data: [
          { id: Tools.SID(), formID: ID, value: 'New', onMenuItemClickCommand: 'New' },
          { id: Tools.SID(), formID: ID, value: 'Delete', onMenuItemClickCommand: 'Delete' }
        ],
        type: { subsign: true }
      },
      { 
        cols: [
          {
            view: "Treetable",
            id: Tools.SID(),
            formID: ID,
            name: "List",
            treeType: true,
            dynamic: true,
            autoUpdate: true,
            updateInterval: 30,
            autoConfig: true,
            dataSchema: { 
                mainObject: { cube: "Goods", type: "Catalogs", model: "Attributes" },
                queryOptions: {order: [["Name", "ASC"]]},
                attributes: ["id", "Code", "Name", "IsColor"]
              },
            url: Application.Name + '/data?appID=' + Application.ID + '&dataSchema=',
            onItemDblClickCommand: 'OpenItem',
            select: true,
            columns:[              
              { id:"Name", header:"Name", fillspace:true, template:"{common.treetable()} #Name#" },
              { id:"IsColor", header:"IsColor", width: 300, template: function(obj) {
                if(obj.IsColor) {
                  return "<span class='webix_icon  wxi-checkbox-marked'></span>";
                } else {
                  return "<span class='webix_icon wxi-checkbox-blank'></span>";
                }
              }}
            ]
          }
        ]
      }
    ]
  }
}
