/* globals Tools Log Module*/
const _async = require("async");

Module.onStart = async function() {
    Log.debug("Cube " + Module.name + " is loaded.");

    let prefix;
    let count = 0;
    let start = new Date();

    //const transaction = await Application._.connection.driver.transaction();
    // for(let i=1; i<1000001; i++) {
    //     const newItem = await Cube.Catalogs.Brands.new();
    //     newItem.Name = "B " + new Date();
    //     await newItem.save();
    //     if (parseInt(i / 1000) === i / 1000) {
    //         const end = new Date();
    //         console.log("1000 items are saved for %d ms", end - start);
    //         start = new Date();
    //     }
    // }
    //transaction.commit()
}