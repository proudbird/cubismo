const Cubismo = require( "./.dist/core/Cubismo").default;
const path = require( "path");
const fs = require( "fs");

let config;
let params;

const configFile = process.argv[2];
const configPath = path.join(__dirname, configFile);
if (!fs.existsSync(configPath)) {
  console.error(`Can't find config file ${configPath}`);
  process.exit(0);
}

try {
  config = require(configPath);
} catch (error) {
  console.error(`Can't read config file ${configFile}`);
  process.exit(0);
}

const paramsFile = process.argv[3];
const paramsPath = path.join(__dirname, paramsFile);
if (!fs.existsSync(paramsPath)) {
  console.error(`Can't find params file ${paramsPath}`);
  process.exit(0);
}

try {
  params = require(paramsPath);
} catch (error) {
  console.error(`Can't read params file ${paramsFile}`);
  process.exit(0);
}

async function execute() {
  const SECRET_KEY = '9y3V2eC6TEtu3ojNd6AmhMghhJY3gPdl';
  try {
    const cubismo = new Cubismo(config, SECRET_KEY);
    await cubismo.start();
    await cubismo.addApplication(params);
    cubismo.stop(SECRET_KEY);
  } catch (error) {
    throw new Error(`Can't init Index app: ${error}`);
  }
}

execute();