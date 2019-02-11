/* globals Tools Application ID ContainerID webix*/
module.exports.Init = function (instance) {

  const definition = instance.model.definition;
  const formTitle = "Item " + definition.name;
  const viewName = "CatalogItem";

  const attributes = [];

  const serviceAttributes = [
            "createdAt", "updatedAt", "deletedAt"];
  const hiddenAttributes = ["droped", "isFolder", 
            "booked", "Date", "parentId", "ownerId", "order"];

  attributes.push({ id: "Code", header: "Code" });

  let fieldId = "Name";
  let order = fieldId;
  if(definition.nameLang && definition.nameLang.length) {
    fieldId = fieldId + "_" + Application.lang;
    order = fieldId;
  }
  attributes.push({ id: fieldId, header: "Name" });

  for (let key in definition.attributes) {
    const element = definition.attributes[key];
    if (!serviceAttributes.includes(key) && element.type.dataType != "FK") {
      let fieldId = element.fieldId;
      if(element.type.lang && element.type.lang.length) {
        fieldId = fieldId + "_" + Application.lang;
      }
      if(!hiddenAttributes.includes(key)) {
        attributes.push({ id: fieldId, header: element.title });
      }
    }
  }

  const rows = [{ view: "Toolbar", name: "Toolbar", owner: viewName, composition: "default", elements: [] }];

  attributes.forEach(row => {
    rows.push(
      {
        view: "Text", 
        name: row.id,
        label: row.header,
        value: instance[row.id]
      }
    );
  })

  return {
    view: "View",
    name: viewName,
    header: formTitle,
    rows: rows
  }
}
