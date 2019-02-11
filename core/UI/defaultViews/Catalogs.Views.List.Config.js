/* globals Tools Application ID ContainerID webix*/
module.exports.Init = function (model) {

  const formTitle = "Catalog " + model.definition.name;
  const listName = "List";

  const columns    = [];
  const attributes = [];

  const serviceAttributes = [
            "createdAt", "updatedAt", "deletedAt"];
  const hiddenAttributes = ["droped", "isFolder", 
            "booked", "Date", "parentId", "ownerId", "order"];

  columns.push({ id: "Code", header: "Code" });
  attributes.push("Code");

  let fieldId = "Name";
  let order = fieldId;
  if(model.definition.nameLang && model.definition.nameLang.length) {
    fieldId = fieldId + "_" + Application.lang;
    order = fieldId;
  }
  columns.push({ id: fieldId, header: "Name" });
  attributes.push(fieldId);

  for (let key in model.definition.attributes) {
    const element = model.definition.attributes[key];
    if (!serviceAttributes.includes(key) && element.type.dataType != "FK") {
      let fieldId = element.fieldId;
      if(element.type.lang && element.type.lang.length) {
        fieldId = fieldId + "_" + Application.lang;
      }
      if(!hiddenAttributes.includes(key)) {
        columns.push({ id: fieldId, header: element.title });
      }
      attributes.push(fieldId);
    }
  }

  const query = {
    SELECT: attributes,
    FROM:   model.name,
    ORDER:  [[order, "ASC"]]
  }

  return {
    view: "View",
    name: "CatalogList",
    header: formTitle,
    rows: [
      { view: "Toolbar", name: "Toolbar", owner: listName, composition: "default", elements: [] },
      { 
        view: "Treetable",
        name: listName,
        autoConfig: true,
        treeType: true,
        select: true,
        columns: columns,
        dynamic: true,
        autoUpdate: true,
        updateInterval: 30,
        query: query,
        events: {
          onItemDblClick: listName + "_onItemDblClick"
        }
      }
    ]
  }
}
