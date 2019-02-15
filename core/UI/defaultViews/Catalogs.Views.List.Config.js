/* globals Tools Application ID ContainerID webix*/
module.exports.Init = function (type, options) {

  const definition = type._.model.definition;
  const formTitle = "Catalog " + definition.name;
  const listName = "List";

  const columns    = [];
  const attributes = [];

  const serviceAttributes = [
            "createdAt", "updatedAt", "deletedAt"];
  const hiddenAttributes = ["id", "dropped"];
  
  hiddenAttributes.forEach(atr => {
    attributes.push(atr);
  })

  if (definition.multilevel) {
    if(definition.multilevelType != "items") {
      attributes.push("isFolder");
    }
    attributes.push("level");
    attributes.push("parentId");
  }

  if (definition.owners && definition.owners.length) {
    attributes.push("ownerId");
  }

  columns.push({ id: "Code", header: "Code", fillspace:true, template:"{common.treetable()} #Code#"  });
  attributes.push("Code");

  let NameField = "Name";
  let order = NameField;
  if(definition.nameLang && definition.nameLang.length) {
    NameField = NameField + "_" + Application.lang;
    order = NameField;
  }
  columns.push({ id: NameField, header: "Name", fillspace:true });
  attributes.push(NameField);

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
    FROM:   type._.model.name,
    ORDER:  [order, "ASC"]
  }

  query.WHERE = [];
  if(options.onlyFolders) {
    query.WHERE.push({ EQ: ["isFolder", true] });
  }

  if(options.owner) {
    query.WHERE.push({ EQ: ["Owner", options.owner] });
  }

  const rows = [];
  if (definition.owners && definition.owners.length) {
    rows.push({
      view: "Lookup",
      name: "Owner",
      label: "Owner",
      dataLink: "item.Owner",
      onlyFolders: false
    });
  }

  rows.push({
    view: "Toolbar",
    name: "Toolbar",
    owner: listName,
    composition: "default",
    elements: []
  });

  rows.push({
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
  });

  return {
    view: "View",
    name: "CatalogList",
    header: formTitle,
    rows: rows
  }
}
