// gito commit
const fs = require('fs');
const shell = require('shelljs');
const readfiles = require('./lib/readfiles');
const properties = require('./lib/properties');
const directoryTree = require('./lib/pathTree');
const workSpace = require('./lib/workSpace');
const { readIndex }  = require('./lib/indexController');
const { jsonToString, compress, parseDirTreeToFilesArray, getShaTree, calcDirTreeSha, getSHA1, getHead } = require('./lib/utils');
const log = require('./lib/log');

function commit (desc, mergeCommitSHA) {
    return new Promise((resolve, reject) => {
        // console.log(desc)
        const workspace = workSpace();
        let newFiles = [];
        let modifiedFiles = [];
        let deletedFiles = [];
        // 1.检查当前文件是否全部加入到index暂存区
        properties().then(excludeFiles => {
            readIndex().then(data => {
                if (!data) {
                    // error: 还没生成index
                    const tree = directoryTree(workspace, {
                        exclude: excludeFiles
                    });
                    newFiles = parseDirTreeToFilesArray(tree);
                    console.log('Untracked files:')
                    newFiles.forEach(f => {
                        log.Untracked(f);
                    });
                    console.log('\nnothing added to commit but untracked files present (use "gito add" to track)');
                    return;
                } else {
                    readfiles(workspace, {
                        exclude: excludeFiles,
                        excludeDir: excludeFiles
                    }, function (err, files) {
                        if (err) {
                            log.err(err);
                        }

                        for (let fk in files) {
                            if (data[fk]) {
                                // 已加入暂存区
                                if (files[fk].SHA1 !== data[fk].SHA1) {
                                    modifiedFiles.push(fk);
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
                            console.log('\nChanges not staged for commit:');
                            modifiedFiles.forEach(f => {
                                log.Untracked(f);
                            });
                        }

                        if (newFiles.length) {
                            console.log('\nUntracked files:');
                            newFiles.forEach(f => {
                                log.Untracked(f);
                            });
                        }

                        if (deletedFiles.length) {
                            console.log('\ndeleted files:');
                            deletedFiles.forEach(f => {
                                log.Untracked(f);
                            });
                        }
                        if (!modifiedFiles.length && newFiles.length) {
                            console.log('\nnothing added to commit but untracked files present (use "gito add" to track)');
                        } else if (modifiedFiles.length && !newFiles.length) {
                            console.log('\nno changes added to commit')
                        }

                        if (!newFiles.length && !modifiedFiles.length && !deletedFiles.length) {
                            // 满足条件，进行文件生成工作,进行以下两个工作:
                            // 2.objects中生成commit实体即tree实体
                            const tree = directoryTree(workspace, {
                                exclude: excludeFiles
                            });
                            const shaTree = getShaTree(tree, data);
                            const fullshaTree = calcDirTreeSha(shaTree);
                            const treeContent = {
                                type: 'tree',
                                metaData: fullshaTree
                            }

                            // 2.1 objects中生成tree对象
                            // TODO: 需要增加一个可以读取tree对象的命令方法
                            const filename = workSpace() + '/.gito/objects/' + fullshaTree.SHA1.substring(0, 2) + '/' + fullshaTree.SHA1.substring(2);
                            const content = compress(jsonToString(treeContent));
                            shell.mkdir(workSpace() + '/.gito/objects/' + fullshaTree.SHA1.substring(0, 2));
                            fs.writeFile(filename, content, (err) => {
                                if(err) {
                                    log.err(err);
                                } else {
                                    // console.log('tree写入成功');
                                }
                            });

                            // 2.2 objects中生成commit对象
                            // TODO: 需要增加一个可以读取commit对象的命令方法
                            getHead().then((ref) => {
                                fs.readFile(ref.refFullPath, { encoding: 'utf8' }, (err, data) => {
                                    let commitObj = {};
                                    commitObj.type = 'commit';
                                    commitObj.tree = fullshaTree.SHA1;
                                    commitObj.time = new Date().getTime();
                                    commitObj.desc = desc;
                                    if (mergeCommitSHA) {
                                        commitObj.merges = {}
                                        commitObj.merges[mergeCommitSHA] = true;
                                    }
                                    if(err) {
                                        commitObj.parent = null;
                                    } else {
                                        commitObj.parent = data;
                                    }
                                    const commitSha = getSHA1(jsonToString(commitObj));
                                    const commitFilename = workSpace() + '/.gito/objects/' + commitSha.substring(0, 2) + '/' + commitSha.substring(2);
                                    const commitContent = compress(jsonToString(commitObj));
                                    shell.mkdir(workSpace() + '/.gito/objects/' + commitSha.substring(0, 2));
                                    fs.writeFile(commitFilename, commitContent, (err) => {
                                        if(err) {
                                            log.err(err);
                                        } else {
                                            // console.log('commit写入成功');
                                            // 3.将当前commit加入到该分支的引用，即写入/refs/heads/xxx文件
                                            fs.writeFile(ref.refFullPath, commitSha, (err) => {
                                                if(err) {
                                                    log.err(err);
                                                } else {
                                                    console.log(`[${ref.curBranch} ${commitSha.substring(0,6)}] ${desc}`);
                                                    if (modifiedFiles.length) {
                                                        console.log(`${modifiedFiles.length} files changed`);
                                                    }
                                                    if (newFiles.length) {
                                                        console.log(`${newFiles.length} files added`);
                                                    }
                                                    if (deletedFiles.length) {
                                                        console.log(`${deletedFiles.length} files deleted`);
                                                    }
                                                    resolve();
                                                }
                                            });
                                        }
                                    });
                                });
                            });
                        }
                    });
                }
            });
        });
    });
}

module.exports = commit;