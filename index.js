// test
const { spawn } = require('child_process');
const { existsSync } = require('fs');
const { EOL } = require('os');
const path = require('path');
const { makeRequest } = require('./request');

// Change working directory if user defined PACKAGEJSON_DIR
if (process.env.PACKAGEJSON_DIR) {
  process.env.GITHUB_WORKSPACE = `${process.env.GITHUB_WORKSPACE}/${process.env.PACKAGEJSON_DIR}`;
  process.chdir(process.env.GITHUB_WORKSPACE);
} else if (process.env.INPUT_PACKAGEJSON_DIR) {
  process.env.GITHUB_WORKSPACE = `${process.env.GITHUB_WORKSPACE}/${process.env.INPUT_PACKAGEJSON_DIR}`;
  process.chdir(process.env.GITHUB_WORKSPACE);
}

console.log('process.env.GITHUB_WORKSPACE', process.env.GITHUB_WORKSPACE);
console.log('process.env.INPUT_REF', process.env.INPUT_REF);

const workspace = process.env.GITHUB_WORKSPACE;
const pkg = getPackageJson();

const isProduction = process.env.INPUT_REF === 'production';

const appId = isProduction 
  ? process.env.INPUT_PARSE_APP_ID
  : process.env.INPUT_PARSE_APP_ID_STAGING;

const masterKey = isProduction
  ? process.env.INPUT_PARSE_MASTER_KEY
  : process.env.INPUT_PARSE_MASTER_KEY_STAGING;

const serverUrl = isProduction
  ? process.env.INPUT_PARSE_SERVER_URL
  : process.env.INPUT_PARSE_SERVER_URL_STAGING;

(async () => {
  
  try {
    const config = {
      method: 'POST',
      url: `${serverUrl}config`,
      data: {
        "params": {
          "appBundleVersion": pkg.version,
          "appVersion": pkg.appVersion
        },
        "masterKeyOnly": {
          "appBundleVersion": false,
          "appVersion": false,
        },
        "_method": 'PUT',
        "_ClientVersion": "js3.4.2",
        "_ApplicationId": appId,
        "_MasterKey": masterKey,
      }
    };
    console.log(config);
    const result = await makeRequest(config);
    const resultData = JSON.parse(result);
    if (resultData.error) throw new Error(resultData.error);
    console.log(result);
  } catch (err) {
    logError(err);
    exitFailure(err);
  }
  
  exitSuccess('Config updated!');
})();

function getPackageJson() {
  const pathToPackage = path.join(workspace, 'package.json');
  if (!existsSync(pathToPackage)) throw new Error("package.json could not be found in your project's root.");
  return require(pathToPackage);
}

function exitSuccess(message) {
  console.info(`✔  success   ${message}`);
  process.exit(0);
}

function exitFailure(message) {
  logError(message);
  process.exit(1);
}

function logError(error) {
  console.error(`✖  fatal     ${error.stack || error}`);
}

function runInWorkspace(command, args) {
  return new Promise((resolve, reject) => {
    console.log('runInWorkspace | command:', command, 'args:', args);
    const child = spawn(command, args, { cwd: workspace });
    let isDone = false;
    const errorMessages = [];
    child.on('error', (error) => {
      if (!isDone) {
        isDone = true;
        reject(error);
      }
    });
    child.stderr.on('data', (chunk) => errorMessages.push(chunk));
    child.on('exit', (code) => {
      if (!isDone) {
        if (code === 0) {
          resolve();
        } else {
          reject(`${errorMessages.join('')}${EOL}${command} exited with code ${code}`);
        }
      }
    });
  });
}
