// import fs from "fs";
// import path from "path";
// import demand from 'demander';

// export default class Base {
    
//     #application : Application;
//     #cube        : Cube;
//     #name        : string;
//     #type        : AppMemberType;
//     #dirname     : string;
//     #filename    : string;
//     #modules     : any;
    
//     constructor(application: Application, cube: MetaDataItem, type: AppMemberType,
//                 name: string, dirname: string, filename: string) {

//         this.#application = application;
//         this.#cube        = cube;
//         this.#name        = name;
//         this.#type        = type;
//         this.#dirname     = dirname
//         this.#filename    = filename;
//         this.#modules    = {};

//         if (!filename) {
//             return
//         };
    
//         const moduleFileName = path.join(dirname, filename);
//         if (!fs.existsSync(moduleFileName)) {
//             throw new Error("Can't find module file '" + moduleFileName + "'");
//         }
//         const id = require.resolve(moduleFileName);
//         let load = true;
//         let storedModule = this.#modules[id];
//         if (storedModule) {
//             let lastUpdated = fs.statSync(moduleFileName).mtime.getTime();
//             if (lastUpdated === storedModule.lastUpdated) {
//                 load = false;
//             }
//         }
    
//         if (load) {
//             if (this.#cube === undefined && filename === "Cube.js") {
//                 cube = this;
//             }
//             demand(moduleFileName, undefined, {
//                 Application: application,
//                 Module:      this,
//                 Cube:        cube
//             }, ['all']);
//             storedModule = {
//                 lastUpdated: fs.statSync(moduleFileName).mtime.getTime()
//             }
//             this.#modules[id] = storedModule;
//         }
//     }

//     get type(): AppMemberType {
//         return this.#type
//     }

//     get name(): string {
//         return this.#name
//     }
// }