const Cubismo = require( "./.dist/core/Cubismo");
const path = require( "path");
const fs = require( "fs");

const configFile = process.argv[2];
const configPath = path.join(__dirname, configFile);
if (!fs.existsSync(configPath)) {
  console.error(`Can't find config file ${configPath}`);
  process.exit(0);
}

let content;
let config;

try {
  content = fs.readFileSync(configPath, 'utf-8');
} catch (error) {
  console.error(`Can't read config file ${configFile}`);
  process.exit(0);
}

try {
  config = JSON.parse(content);
} catch (error) {
  console.error(`Can't parse config file ${configFile}`);
  process.exit(0);
}

const paramsFile = process.argv[3];
const paramsPath = path.join(__dirname, paramsFile);
if (!fs.existsSync(configPath)) {
  console.error(`Can't find params file ${paramsPath}`);
  process.exit(0);
}

let params;

try {
  content = fs.readFileSync(paramsPath, 'utf-8');
} catch (error) {
  console.error(`Can't read params file ${paramsFile}`);
  process.exit(0);
}

try {
  params = JSON.parse(content);
} catch (error) {
  console.error(`Can't parse params file ${paramsFile}`);
  process.exit(0);
}

async function execute() {
  try {
    const cubismo = new Cubismo(config);
    await cubismo.start();
    cubismo.addApplication(params);
  } catch (error) {
    throw new Error(`Can't init Index app: ${error}`);
  }
}

execute();