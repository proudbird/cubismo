// import { expect, should } from 'chai';
// import { CubismoSettings, NewApplicationParameters } from '../../core/types';
// import { readFileSync } from "fs";
// import { join } from 'path';
// import Cubismo from "../../core/Cubismo";

// const config = {
//   host: "127.0.0.1",
//   port: 21021,
//   cubes: "c:\\ITProjects\\cubismo\\server\\cubes",
//   connection: {
//     host: "127.0.0.1",
//     port: 5432,
//     dialect: "postgres",
//     database: "cubismo",
//     username: "cubismo",
//     password: "cubismo"
//   },
//   defaults: {
//     workspaces: "c:\\ITProjects\\cubismo\\workspaces",
//     connection: {
//       host: "127.0.0.1",
//       port: 5432,
//       dialect: "postgres",
//       username: "cubismo",
//       password: "cubismo"
//     }
//   },
//   templates: {
//     optima: [
//       "Common",
//       "Connector1C",
//       "ExtDB",
//       "Inventory",
//       "Marketplaces",
//       "MarketplacesAPI",
//       "Server",
//       "Wildberries",
//       "Wildberries1C",
//       "WildberriesAPI"
//     ],
//     index: [
//       "Admin",
//       "Common",
//       "Mail",
//       "Verification"
//     ]
//   }
// } as CubismoSettings;

// describe('Manipulation applications', function() {
//   const connection = {
//     host: "127.0.0.1",
//     port: 5432,
//     database: "index",
//     username: "cubismo",
//     password: "cubismo", 
//     dialect: "postgres"
//   };

//   const params = {
//     id: 'index',
//     workspace: join(__dirname, "workspaces/test"),
//     defaultLang: 'en',
//     connection,
//     template: 'index',
//     user: {
//       name: 'Super User',
//       login: 'admin',    
//       email: 'proudbird@optima.tools',    
//       password: '123'
//     }
//   } as NewApplicationParameters;

//   process.env.CAN_DUPLICATE_APPS = 'true';

//   it(`should add application settings to cubismo database`, () => {
//     async function execute() {
//       try {
//         const cubismo = new Cubismo(config);
//         await cubismo.start();
//         cubismo.addApplication(params);
//       } catch (error) {
//         throw new Error(`ups`);
//       }
//     }
    
//     should().not.Throw(execute);
//   });
// });