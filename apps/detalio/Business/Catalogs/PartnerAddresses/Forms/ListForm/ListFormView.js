/* globals Tools Application ID ContainerID webix*/
var UploaderListID = Tools.SID();
module.exports.Init = function (Master) {
  return {
    view: "Form",
    id: ID,
    containerID: ContainerID,
    name: "Form",
    header: 'Partner addresses',
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
                mainObject: { cube: "Business", type: "Catalogs", model: "PartnerAddresses" },
                queryOptions: {order: [["Name", "ASC"]]},
                attributes: ["id", "Code", "Name", "Address1", "Address2"]
              },
            url: Application.Name + '/data?appID=' + Application.ID + '&dataSchema=',
            onItemDblClickCommand: 'OpenItem',
            select: true,
            columns:[              
              { id: "Name", header: "Name", fillspace: true, template: "{common.treetable()} #Name#" },
              { id: "Code", header: "Code"},
              { id: "Address1", header: "Address 1"},
              { id: "Address2", header: "Address 2"}
            ]
          }
        ]
      }
    ]
  }
}
