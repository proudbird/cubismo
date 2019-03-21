let items;
const variations = {};
const attributes = {};
const options = {};
const _combinations = {};

View.onLoad = async function() {
  await defineVariations();
  addOptions();
}

View.btnOK_onClick = function() {
  View.close("works!!!");
}

View.OptionButton_onItemClick = function(value) {
  const attributeId = value[0];
  const optionId = value[1];

  options[attributeId] = optionId;
  const check = Tools.clone(options);

  let item = getItem(options);
  if(item) {
    Item = item;
    View[attributes[attributeId].values[optionId].Value].enable();
  }
  let find = false;
  for(let key in attributes) {
    const attribute = attributes[key];
    for(let valueKey in attribute.values) {
      check[key] = valueKey;
      nItem = getItem(check);
      if(nItem) {
        find = true;
        if(!item && !find) {
          Item = nItem;
        }
        View[attribute.values[valueKey].Value].enable();
      } else {
        View[attribute.values[valueKey].Value].disable();
      }
    }
    check[attributeId] = optionId;
  } 
}

function getItem(check) {
  let item;
  for(let key in variations) {
    let ok = true;
    for(let optionKey in check) {
      const id = check[optionKey];
      if(!key.includes(id)) {
        ok = false;
        break;
      }
    }
    if(ok) {
      item = variations[key];
      break;
    }
  }
  return item;
}

async function defineVariations() {
  items = await Application.Products.Catalogs.Products
    .select({ where: { parentId: Item.getValue("id") } });

  const parent = items[0].Parent;
  parent.Attributes.forEach((attribute, index) => {
    _combinations[attribute.getValue("id")] = { 
      index: index,
      attribute: attribute
    };
  });

  items.forEach(item => {
    const combinations = item.Variation.Combinations;
    const variationIds = [];
    for(i=0; i<combinations.length; i++) {
      const combination = combinations[i];
      const attrId = combination.Attribute.getValue("id");
      if(!attributes[attrId]) {
        attributes[attrId] = { 
          attribute: combination.Attribute,
          values: {}
        };
      }
      const valueId = combination.Value.getValue("id");
      if(!attributes[attrId].values[valueId]) {
        attributes[attrId].values[valueId] = combination.Value;
      }
      variationIds.push(valueId)
    }
    variations[variationIds.join("+")] = item;
  });

  const item = items[0];
  const combinations = item.Variation.Combinations;
  for(i=0; i<combinations.length; i++) {
    const combination = combinations[i];
    options[combination.Attribute.getValue("id")] = combination.Value.getValue("id");
  }
  
}

function addOptions() {
  Tools.forIn(attributes, (attr, attrKey) => {
    const option = attr.attribute.Name;
    View.Options.addView({
      view: "Group",
      name: option,
      cols: []
    });
    Tools.forIn(attr.values, (value, valueKey) => {
      const button = {
        view: "Button",
        name: value.Value, 
        label: value.Value,
        value: [attrKey, valueKey],
        css: "eshop_button",
        events: { onItemClick: "OptionButton_onItemClick" }
      };
      if(attr.attribute.IsColor) {
        if(value.Path) {
          button.type = "image";
          button.image = "/files/" + value.Path;
          button.width = 60;
          button.height = 60;
          button.css = "eshop_button_swatch";
        }
      }
      View[option].addView(button);
    })
  })
}