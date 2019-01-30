/* globals Tools Application ID ContainerID webix*/
var UploaderListID = Tools.SID();
module.exports.Init = function (Instance) {
  return {
    view: "Form",
    id: ID,
    containerID: ContainerID,
    name: "Form",
    header: 'Partner',
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
                name: 'FullName',
                label: 'Full name',
                value: Instance.FullName,
                dataBind: 'Instance.FullName'
              },
              {
                view: 'lookup',
                id: Tools.SID(),
                formID: ID,
                name: 'LegalAddress',
                label: 'Legal address',
                instance: Instance.LegalAddress,
                dataLink: { cube: "Business", class: "Catalogs", type: "PartnerAddresses" },
                dataBind: 'Instance.LegalAddress'
              },
              {
                view: 'lookup',
                id: Tools.SID(),
                formID: ID,
                name: 'PostalAddress',
                label: 'Postal address',
                instance: Instance.PostalAddress,
                dataLink: { cube: "Business", class: "Catalogs", type: "PartnerAddresses" },
                dataBind: 'Instance.PostalAddress'
              },
              {}
            ]
          }
        ]
      }
    ]
  }
}
