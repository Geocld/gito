const path = require('path');
const fs = require('fs');
const shell = require('shelljs');
const workSpace = require('./lib/workSpace');
const log = require('./lib/log');

init = function () {
    const projectDir = workSpace();
    fs.exists(`${projectDir}/.gito`, (is_exist) => {
        if (is_exist) {
            console.log('your project has been Initialized.');
        } else {
            shell.mkdir(`${projectDir}/.gito`, `${projectDir}/.gito/objects`, `${projectDir}/.gito/refs`, `${projectDir}/.gito/refs/heads`);
            fs.writeFile(`${projectDir}/.gito/HEAD`, 'ref: refs/heads/master', (err) => {
                if (err) {
                    log.err(err);
                }
                console.log(`Initialized empty gito repository in ${projectDir}`);
            });
        }
    });
}

module.exports = init;