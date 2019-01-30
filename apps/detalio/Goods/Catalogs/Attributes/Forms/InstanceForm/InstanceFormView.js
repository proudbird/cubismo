/* globals Tools Application ID ContainerID webix*/
var UploaderListID = Tools.SID();
module.exports.Init = function (Instance) {
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
                view: 'Checkbox',
                id: Tools.SID(),
                formID: ID,
                name: 'IsColor',
                label: 'This is color',
                value: Instance.IsColor,
                dataBind: 'Instance.IsColor'
              },
              {
                rows: [
                  {
                    id: Tools.SID(),
                    formID: ID,
                    view: "Menu",
                    name: "ValuesMenu",
                    data: [
                      { id: Tools.SID(), formID: ID, value: 'Add', icon: "plus", onMenuItemClickCommand: 'Add' },
                      { id: Tools.SID(), formID: ID, value: 'Remove', icon: "remove", onMenuItemClickCommand: 'Remove' }
                    ],
                    type: { subsign: true }
                  },
                  {
                    view: 'Datatable',
                    id: Tools.SID(),
                    formID: ID,
                    name: 'Values',
                    label: 'Values',
                    data: Tools.dataToJSON(Instance.Values),
                    dataBind: "Instance.Values",
                    editable: true,
                    editaction: "dblclick",
                    select: true,
                    multiselect:true,
                    scroll: "x",
                    header: false,
                    columns:[
                      { id: "Value", header:"Value", editor:"text", fillspace: true}
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
