// import { Sequelize } from "sequelize/types";

// export default function build(driver: Sequelize, from: string | DataTable, as: string) {

//   let result: string;
//   let model: any;
//   as = as || 'T1';

//   if(Utils.isString(from)) {
//     // 'from' is possibly a model name of existing MeteData onject
//     model = driver.models[(from as string)];
//     result = `FROM "${model.tableName}" ${as}`;
//     if(!model) {
//       throw new Error(`Can't find MetaData object '${from}'!`);
//     }
//   } else {
//     // 'from' is possibly a temp data table
//     from = (from as DataTable);
//     if(from.columns && from.rows) {
//       const columns = [];
//       for(let col of from.columns) {
//         columns.push(describeColumn(col));
//       };
//       const tempTableName = `temp_${Utils.sid()}`;
//       result = `FROM "${tempTableName}" ${as}`;
//       result = `CREATE TEMP TABLE ${tempTableName} (${columns.join(', ')});\n`;
//       const insertions = defineInsertions(from.columns, tempTableName, from.rows);
      
//       result = result + insertions.join(' ');
      
//     } else {
//       throw new Error(`Statement 'FROM' has incorrect value!`);
//     }
//   }
// }