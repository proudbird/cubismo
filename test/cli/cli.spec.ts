// import { expect, should } from 'chai';
// import { readFileSync } from "fs";
// import { join } from 'path';
// import { registerInstance } from "../../cli/run";

// describe('Writes running cubismo instance info to the registration file', function() {
//   const etalon = {
//     pid: 5858,
//     workDir: __dirname,
//     host: '127.0.0.1', 
//     port: 5555 
//   };

//   let pathToRegisterFile = getRegisterFile();

//   it(`should write info to the file instancies.json`, () => {
//     function execute() {
//       registerInstance(etalon, pathToRegisterFile);
//     }
    
//     should().not.Throw(execute);
//   });

//   it(`the content of written instancies.json file should contain registered instance`, () => {
//     const content = JSON.parse(readFileSync(pathToRegisterFile, 'utf-8'));
    
//     expect(content).to.deep.include(etalon);
//   });
// });

// function getRegisterFile(): string {

//   return join(__dirname, 'instancies.json');
// }