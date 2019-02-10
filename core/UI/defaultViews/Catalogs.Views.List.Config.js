/* globals Tools Application ID ContainerID webix*/
module.exports.Init = function (model) {

  const formTitle = "Catalog " + model.modelName;

  const columns    = [];
  const attributes = [];

  const serviceFields = ["droped", "isFolder", 
            "booked", "Date", "parentId", "ownerId",
            "createdAt", "updatedAt", "deletedAt", "order"];

  for (let key in model.tableAttributes) {
    if (model.tableAttributes.hasOwnProperty(key) && !serviceFields.includes(key)) {
      const element = model.tableAttributes[key];
      columns.push({ id: element.fiel, header: element.fieldName });
      attributes.push(element.field);
    }
  }

  const query = {
    SELECT: attributes,
    FROM:   model.name,
    ORDER:  [["Name_ru", "ASC"]]
  }

  return {
    view: "View",
    name: "CatalogList",
    header: formTitle,
    rows: [
      { 
        view: "Treetable",
        name: "List",
        autoConfig: true,
        treeType: true,
        select: true,
        columns: columns,
        dynamic: true,
        autoUpdate: true,
        updateInterval: 30,
        query: query,
        events: {
          onItemDblClick: "List_onItemDblClick"
        }
      }
    ]
  }
}
