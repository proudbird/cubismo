/* globals Tools Application ID ContainerID webix*/
var UploaderListID = Tools.SID();
module.exports.Init = function (Instance) {
  return {
    view: "Form",
    id: ID,
    containerID: ContainerID,
    name: "Form",
    header: 'Country',
    rows: [
      {
        id: Tools.SID(),
        formID: ID,
        view: "Menu",
        name: "Menu",
        data: [
          { id: Tools.SID(), formID: ID, value: 'OK', onMenuItemClickCommand: 'Ok' }
        ],
        type: { subsign: true }
      },
      {
        view: 'layout',
        id: Tools.SID(),
        formID: ID,
        name: 'Layout',
        type: 'form',
        cols: [{
            rows: [
              {
                view: 'Text',
                id: Tools.SID(),
                formID: ID,
                name: 'Name',
                label: 'Name',
                value: Instance.Name,
                dataBind: 'Instance.Name'
              },
              {
                view: 'Text',
                id: Tools.SID(),
                formID: ID,
                name: 'Code',
                label: 'Code',
                value: Instance.Code,
                dataBind: 'Instance.Code'
              },
              {
                view: 'Text',
                id: Tools.SID(),
                formID: ID,
                name: 'Address1',
                label: 'Address 1',
                value: Instance.Address1,
                dataBind: 'Instance.Address1'
              },
              {
                view: 'Text',
                id: Tools.SID(),
                formID: ID,
                name: 'Address2',
                label: 'Address 2',
                value: Instance.Address2,
                dataBind: 'Instance.Address2'
              },
              {
                view: 'lookup',
                id: Tools.SID(),
                formID: ID,
                name: 'Country',
                label: 'Country',
                instance: Instance.Country,
                dataLink: { cube: "Main", class: "Catalogs", type: "Countries" },
                dataBind: 'Instance.Country'
              },
              {}
            ]
          }
        ]
      }
    ]
  }
}
