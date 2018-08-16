const fs = require('fs');
const readfiles = require('./lib/readfiles');
const properties = require('./lib/properties');
const { readIndex } = require('./lib/indexController');
const workSpace = require('./lib/workSpace');
const log = require('./lib/log');
const directoryTree = require('./lib/pathTree');
const { parseDirTreeToFilesArray, parseJson, uncompress, getHead } = require('./lib/utils');

function checkHead () {
    return new Promise ((resolve, reject) => {
        getHead().then((ref) => {
            fs.exists(ref.refFullPath, (e) => {
                if (!e) {
                    console.log(`On branch ${ref.curBranch}`);
                    console.log('No commits yet\n');
                    resolve(null);
                } else {
                    fs.readFile(ref.refFullPath, { encoding: 'utf8' }, (err, data) => {
                        if (err) {
                            log.err(err);
                        }
                        resolve(data); // 返回的是当前分支commit的SHA1
                    });
                }
            });
        });
    });
}

function compareWorkspaceAndIndex (files, data) {
    let newFiles = [];
    let modifiedFiles = [];
    let deletedFiles = [];
    let nochangeFiles = [];
    let isEqule = false;

    for (let fk in files) {
        if (data[fk]) {
            // 已加入暂存区
            if (files[fk].SHA1 !== data[fk].SHA1) {
                modifiedFiles.push(fk);
            } else {
                nochangeFiles.push(fk);
            }
        } else {
            newFiles.push(fk);
        }
    }
    for (let dk in data) {
        if (!files[dk]) {
            deletedFiles.push(dk);
        }
    }

    if (modifiedFiles.length) {
        console.log('Changes not staged for commit:');
        console.log('(use "git add <file>..." to update what will be committed) \n');
        modifiedFiles.forEach(f => {
            log.Untracked(f);
        });
    }

    if (newFiles.length) {
        console.log('Untracked files:');
        console.log('(use "gito add <file>..." to include in what will be committed) \n');
        newFiles.forEach(f => {
            log.Untracked(f);
        });
    }

    if (deletedFiles.length) {
        console.log('deleted files:');
        deletedFiles.forEach(f => {
            log.Untracked(f);
        });
    }

    if (!modifiedFiles.length && !newFiles.length && !deletedFiles.length) {
        isEqule = true;
    }
    return isEqule;
}

function compareIndexAndCommit (data, commitData) {
    // console.log('index is:', data)
    // console.log('commit data is:', commitData)
    let newFiles = [];
    let modifiedFiles = [];
    let deletedFiles = [];
    const objectsDir = workSpace() + '/.gito/objects/';
    const commitDirName = commitData.substring(0, 2);
    const commitFileName = commitData.substring(2);
    fs.exists(objectsDir + commitDirName, e => {
        if (!e) {
            log.err('commit file does not exist.');
        } else {
            fs.readFile(objectsDir + commitDirName + '/' + commitFileName, (ce, cdata) => {
                if (ce) {
                    log.err(ce);
                } else {
                    uncompress(cdata).then((commitStr) => {
                        const commitObj = parseJson(commitStr);
                        const treeSHA1 = commitObj.tree;
                        const treeDirName = treeSHA1.substring(0, 2);
                        const treeFileName = treeSHA1.substring(2);
                        // 根据tree的SHA1获取整个目录的状态
                        fs.readFile(objectsDir + treeDirName + '/' + treeFileName, (te, tdata) => {
                            if (te) {
                                log.err(te);
                            } else {
                                uncompress(tdata).then((treeStr) => {
                                    const treeObj = parseJson(treeStr);
                                    const treeArr = parseDirTreeToFilesArray(treeObj.metaData, [], { withSHA: true });
                                    let treePaths = {};
                                    treeArr.forEach(tItem => {
                                        treePaths[tItem.path] = { SHA1: tItem.SHA1 };
                                        if (!data[tItem.path]) {
                                            deletedFiles.push(tItem.path);
                                        } else {
                                            if (data[tItem.path].SHA1 !== tItem.SHA1) {
                                                modifiedFiles.push(tItem.path);
                                            }
                                        }
                                    });

                                    for (let dk in data) {
                                        if (!treePaths[dk]) {
                                            newFiles.push(dk);
                                        }
                                    }

                                    if (newFiles.length) {
                                        newFiles.forEach(f => {
                                            log.green('new file:    ' + f);
                                        });
                                    }

                                    if (modifiedFiles.length) {
                                        modifiedFiles.forEach(f => {
                                            log.green('modified:   ' + f);
                                        });
                                    }

                                    if (deletedFiles.length) {
                                        deletedFiles.forEach(f => {
                                            log.green('deleted:   ' + f);
                                        });
                                    }

                                    if (!newFiles.length && !modifiedFiles.length && !deletedFiles.length) {
                                        console.log('nothing to commit, working tree clean');
                                    }
                                    
                                });
                            }
                        });

                    });
                }
            });
        }
    })
}

status = function () {
    const workspace = workSpace();
    // 读取.gitignore
    properties().then(excludeFiles => {
        // 读取索引index
        readIndex().then(data => {
            if (!data) {
                checkHead().then((masterData) => {
                    const tree = directoryTree(workspace, {
                        exclude: excludeFiles
                    });
                    const filesArr = parseDirTreeToFilesArray(tree);
                    console.log('Untracked files:');
                    console.log('(use "gito add <file>..." to include in what will be committed) \n');
                    filesArr.forEach(f => {
                        log.Untracked(f);
                    });
                });
            } else {
                // 检查是否有提交过commit
                checkHead().then((commitData) => {

                    // 已经有stage,读取index并与当前工作区的内容比较，得到有改动的状态
                    // console.log("index data is:", data);

                    // 读取当前项目文件（含内容）
                    readfiles(workspace, {
                        exclude: excludeFiles,
                        excludeDir: excludeFiles
                    }, function (err, files) {
                        if (err) {
                            log.err(err);
                        }
                        // console.log('finished reading files:',files);
                        if (!commitData) {
                            // 还没有commit数据
                            console.log('Changes to be committed:\n');
                            for (let ffk in data) {
                                log.green(ffk);
                            }
                            console.log('\n');
                            return;
                        } else {
                            // 有过commit记录,先比较工作区与暂存区index的区别
                            const isNext = compareWorkspaceAndIndex(files, data);

                            if (isNext) {
                                // 再比较index与commit的区别(这种情况是只add还没commit的情况)
                                compareIndexAndCommit(data, commitData);
                            }
                        }

                    });
                });
            }
        });
    }).catch(e => {
        log.err(e);
    });
}

module.exports = status;