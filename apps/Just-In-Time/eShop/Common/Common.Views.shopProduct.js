View.onLoad = function() {
  setVariations()
}

View.btnOK_onClick = function() {
  View.close("works!!!");
}

async function setVariations() {
  const items = await Application.Products.Catalogs.Products
    .select({ where: { parentId: Item.getValue("id") } });
  
  const attributes = {};

  items.forEach(item => {
    const combinations = item.Variation.Combinations;
    combinations.forEach(combination => {
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
    })
  });

  console.log(attributes)
}