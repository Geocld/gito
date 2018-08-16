const fs = require('fs');
const shell = require('shelljs');
const readfiles = require('./lib/readfiles');
const properties = require('./lib/properties');
const { readIndex, writeIndex } = require('./lib/indexController');
const workSpace = require('./lib/workSpace');
const log = require('./lib/log');
const { jsonToString, parseJson, parseDirTreeToFilesArray, uncompress, getHead } = require('./lib/utils');

function reset () {
    const workspace = workSpace();
    let commitSearchPath = '';
    let CommitCon = null;
    let tree = '';
    let treeSearchPath = '';
    let TreeCon = null;
    let filesArr = [];
    properties().then(excludeFiles => {
        readfiles(workspace, {
            exclude: excludeFiles,
            excludeDir: excludeFiles
        }, function (err, localFiles) {
            if (err) {
                log.err(err);
            }
            // console.log('当前目录下的文件状态为:', localFiles);
            getHead().then(ref => {
                fs.exists(ref.refFullPath, e => {
                    if (!e) { // 还没提交过，本地文件全部清空
                        for (let k in localFiles) {
                            shell.rm(k);
                        }
                    } else {
                        fs.readFile(ref.refFullPath, {encoding: 'utf8'}, (err, commitData) => {
                            if (err) {
                                log.err(err);
                            } else {
                                readfiles(`${workSpace()}/.gito/objects/`, {
                                    noSHA: true,
                                    exclude: ['.DS_Store'],
                                }, function (err, obfiles) {
                                    if (err) {
                                        log.err(err);
                                    }
                                    // 查找commit
                                    commitSearchPath = `${workSpace()}/.gito/objects/${commitData.substring(0, 2)}/${commitData.substring(2)}`;
                                    if (!obfiles[commitSearchPath]) {
                                        log.err(`Commit can not find ${commitSearchPath}`);
                                    }
                                    CommitCon = parseJson(obfiles[commitSearchPath].content);
                                    tree = CommitCon.tree;
                                    // 查找tree
                                    treeSearchPath = `${workSpace()}/.gito/objects/${tree.substring(0, 2)}/${tree.substring(2)}`;
                                    if (!obfiles[treeSearchPath]) {
                                        log.err(`Tree can not find ${treeSearchPath}`);
                                    }
                                    // 这里拿到的事一个目录树结构，内含文件的SHA1，为了方便通过k-v的形式拿到文件的SHA1，需要把目录树铺平
                                    TreeCon = parseJson(obfiles[treeSearchPath].content);
                                    filesArr = parseDirTreeToFilesArray(TreeCon.metaData, [], { withSHA: true });
                                    let commitedFiles = {};
                                    filesArr.forEach(item => {
                                        commitedFiles[item.path] = item.SHA1;
                                    });
                                    // console.log('gito工作区保存的文件状态为:', commitedFiles)
                                    // 1.直接与commit比较，提取需要还原的文件（修改、删除需还原，新增需删除)
                                    let newFiles = [];
                                    let modifiedFiles = [];
                                    let deletedFiles = [];
                                    for (let lk in localFiles) {
                                        if (!commitedFiles[lk]) {
                                            newFiles.push(lk);
                                        } else {
                                            if (localFiles[lk] !== commitedFiles[lk]) {
                                                modifiedFiles.push(lk);
                                            }
                                        }
                                    }
                                    for (let ck in commitedFiles) {
                                        if (!localFiles[ck]) {
                                            deletedFiles.push(ck);
                                        }
                                    }
                                    let writeFiles = modifiedFiles.concat(deletedFiles);
                                    let resetFilesPromises = [];
                                    if (writeFiles.length) {
                                        writeFiles.forEach(f => {
                                            resetFilesPromises.push(Promise.resolve(
                                                new Promise((resolve, reject) => {
                                                    let blobSearchPath = `${workSpace()}/.gito/objects/${commitedFiles[f].substring(0, 2)}/${commitedFiles[f].substring(2)}`;
                                                    BlobCon = parseJson(obfiles[blobSearchPath].content);
                                                    fs.writeFile(f, BlobCon.content, (err) => {
                                                        if(err) {
                                                            reject(err);
                                                        } else {
                                                            resolve();
                                                        }
                                                    });
                                                })
                                            ));
                                        });
                                        
                                        Promise.all(resetFilesPromises).then(() => {
                                            console.log('modified and deleted files reset successfully.');
                                            // 重新写入index
                                            setTimeout(() => {
                                                readfiles(workspace, {
                                                    exclude: excludeFiles,
                                                    excludeDir: excludeFiles
                                                }, function (err, newlocalFiles) {
                                                    if (err) {
                                                        log.err(err);
                                                    }
                                                    let filesWithoutContent = parseJson(jsonToString(newlocalFiles));
                                                    for (let k in filesWithoutContent) {
                                                        delete filesWithoutContent[k].metaData;
                                                    }
                                                    writeIndex(filesWithoutContent).then(() => {
                                                        console.log('Index rewrite succeeded.')
                                                    });
                                                });
                                            }, 500);
                                        });
                                    }
                                    if (newFiles.length) {
                                        shell.rm(newFiles);
                                        console.log('New files reset succeeded.')
                                    }
            
                                });
                            }
                        });
                    }
                });
            });
        });
    });
}

module.exports = reset;