/* globals Tools Application ID ContainerID webix*/
module.exports.Init = function (type) {

  const definition = type._private.model.definition;
  const formTitle = "Catalog " + definition.name;
  const listName = "List";

  const columns    = [];
  const attributes = [];

  const serviceAttributes = [
            "createdAt", "updatedAt", "deletedAt"];
  const hiddenAttributes = ["id", "dropped", "isFolder", 
            "parentId", "ownerId"];
  
  hiddenAttributes.forEach(atr => {
    attributes.push(atr);
  })

  columns.push({ id: "Code", header: "Code", fillspace:true });
  attributes.push("Code");

  let fieldId = "Name";
  let order = fieldId;
  if(definition.nameLang && definition.nameLang.length) {
    fieldId = fieldId + "_" + Application.lang;
    order = fieldId;
  }
  columns.push({ id: fieldId, header: "Name", fillspace:true });
  attributes.push(fieldId);

  for (let key in definition.attributes) {
    const element = definition.attributes[key];
    if (!serviceAttributes.includes(key) && element.type.dataType != "FK") {
      let fieldId = element.fieldId;
      if(element.type.lang && element.type.lang.length) {
        fieldId = fieldId + "_" + Application.lang;
      }
      if(!hiddenAttributes.includes(key)) {
        columns.push({ id: fieldId, header: element.title, fillspace:true });
      }
      attributes.push(fieldId);
    }
  }

  const query = {
    SELECT: attributes,
    FROM:   type._private.model.name,
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
        multiselect: true,
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
