const fs = require('fs');
const shell = require('shelljs');
const readfiles = require('./lib/readfiles');
const workSpace = require('./lib/workSpace');
const log = require('./lib/log');
const { getHead } = require('./lib/utils');
const reset = require('./reset');

function listBranch () {
    readfiles(`${workSpace()}/.gito/refs/heads`, {
        exclude: ['.DS_Store'],
    }, function (err, hdfiles) {
        if (err) {
            log.err(err);
        }
        getHead().then(ref => {
            const regx = new RegExp(`${workSpace()}/.gito/refs/heads/`, 'g');
            for (let name in hdfiles) {
                const sortName = name.replace(regx, '');
                if (sortName === ref.curBranch) {
                    log.green(`*${sortName}`)
                } else {
                    console.log(sortName)
                }
            }
        });
    });
}

function createBranch (branchname) {
    const newBranchPath = `${workSpace()}/.gito/refs/heads/${branchname}`;
    readfiles(`${workSpace()}/.gito/refs/heads`, {
        exclude: ['.DS_Store'],
    }, function (err, hdfiles) {
        if (err) {
            log.err(err);
        }
        if (hdfiles[newBranchPath]) {
            console.log(`fatal: A branch named '${branchname}' already exists.`);
            return false;
        }
        // console.log(hdfiles)
        getHead().then(ref => {
            fs.writeFile(newBranchPath, hdfiles[ref.refFullPath].metaData.content, (err, data) => {
                if (err) {
                    log.err(err);
                }
                console.log(`A new branch named '${branchname}' is created.`);
            });
        });
        
    });
}

function deleteBranch (branchname) {
    const newBranchPath = `${workSpace()}/.gito/refs/heads/${branchname}`;
    readfiles(`${workSpace()}/.gito/refs/heads`, {
        exclude: ['.DS_Store'],
    }, function (err, hdfiles) {
        if (err) {
            log.err(err);
        }
        if (!hdfiles[newBranchPath]) {
            log.err(`branch '${branchname}' not found.`);
        }
        getHead().then(ref => {
            if (ref.curBranch === branchname) {
                log.err(`Cannot delete branch '${branchname}' checked out at '${workSpace()}'`);
            }
            shell.rm(newBranchPath);
            console.log(`Deleted branch ${branchname} (was ${hdfiles[newBranchPath].metaData.content.substring(0, 7)}).`)
        });
    });
}

function switchBranch (branchname) {
    const branchPath = `${workSpace()}/.gito/refs/heads/${branchname}`;
    readfiles(`${workSpace()}/.gito/refs/heads`, {
        exclude: ['.DS_Store'],
    }, function (err, hdfiles) {
        if (err) {
            log.err(err);
        }
        if (!hdfiles[branchPath]) {
            log.err(`branchname '${branchname}' did not match any branch(s) known to gito.`);
        }
        getHead().then(ref => {
            if (ref.curBranch === branchname) {
                console.log(`Already on '${branchname}'`);
                return false;
            }
            fs.writeFile(`${workSpace()}/.gito/HEAD`, `ref: refs/heads/${branchname}`, (err, data) => {
                if (err) {
                    log.err(err);
                }
                // 修改HEAD同时reset至当前head指向的commit
                reset();
                console.log(`Switched to branch '${branchname}'`);
            });
        });
    });
}

module.exports = {
    listBranch,
    createBranch,
    deleteBranch,
    switchBranch
}