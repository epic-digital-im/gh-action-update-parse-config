// test
const { spawn } = require('child_process');
const { existsSync } = require('fs');
const { EOL } = require('os');
const path = require('path');
const request = require('request');

// Change working directory if user defined PACKAGEJSON_DIR
if (process.env.PACKAGEJSON_DIR) {
  process.env.GITHUB_WORKSPACE = `${process.env.GITHUB_WORKSPACE}/${process.env.PACKAGEJSON_DIR}`;
  process.chdir(process.env.GITHUB_WORKSPACE);
} else if (process.env.INPUT_PACKAGEJSON_DIR) {
  process.env.GITHUB_WORKSPACE = `${process.env.GITHUB_WORKSPACE}/${process.env.INPUT_PACKAGEJSON_DIR}`;
  process.chdir(process.env.GITHUB_WORKSPACE);
}

console.log('process.env.GITHUB_WORKSPACE', process.env.GITHUB_WORKSPACE);
const workspace = process.env.GITHUB_WORKSPACE;
const pkg = getPackageJson();

(async () => {
  
  try {
    await makeRequest(
      'PUT', 
      'https://api.canmonkey-staging.com/parse/config', 
      {
        "appBundleVersion": pkg.version,
        "appVersion": pkg.appVersion
      },
      {
        "appBundleVersion": false,
        "appVersion": false,
      }
    );
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
  //return execa(command, args, { cwd: workspace });
}

function makeRequest(method, url, params, masterKeyOnly) {
  return new Promise((resolve, reject) => {
    var options = {
      'method': 'POST',
      'url': url,
      'headers': {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "params": params,
        "masterKeyOnly": masterKeyOnly,
        "_method": method,
        "_ApplicationId": process.env.PARSE_APP_ID,
        "_MasterKey": process.env.PARSE_MASTER_KEY,
      })
    };
    request(options, function (error, response) {
      if (error) {
        reject(error);
      } else {
        resolve(response.body);
      }
    });
  });
}
