const  fs = require('fs');
const { merge } = require('node-diff3')
const readfiles = require('./lib/readfiles');
const workSpace = require('./lib/workSpace');
const log = require('./lib/log');
const { jsonToString, parseJson, parseDirTreeToFilesArray, uncompress, getHead } = require('./lib/utils');
const add = require('./add');
const commit = require('./commit');

// 把obfiles里的路径转为纯SHA1-value的形式
function formatObFiles (obfiles) {
    let newObFiles = {};
    for (let i in obfiles) {
        const pathArr = i.split('/');
        const SHA1 = pathArr[pathArr.length - 2] + pathArr[pathArr.length - 1];
        newObFiles[SHA1] = obfiles[i];
    }
    return newObFiles;
}

// 得到如下格式:
// { data:
//     { type: 'commit',
//       tree: '554b05516a097e5705bdc6a468f534b62ddbd89f',
//       time: 1534302607516,
//       desc: 'dev update',
//       merges: {xxx}
//       parent: '63837d9e87f6fe7743a7a1666d8f8126b0c1e279',
//       commit: '10e2c1dd201ce1f84c4da9eff3592fec9d4ce9bb' },
//    next:
//     { data:
//        { type: 'commit',
//          tree: '9f23cba75f429809c6e87b910adde689786d28ee',
//          time: 1534239056799,
//          desc: 'update',
//          parent: null,
//          commit: '63837d9e87f6fe7743a7a1666d8f8126b0c1e279' },
//       next: null } }
function getCommitList (files, headCommit, result = {}) {
    if (files[headCommit]) {
        result.data = parseJson(files[headCommit].content);
        result.data.commit = headCommit;
        if (!result.data.parent) {
            result.next = null;
        } else {
            result.next = getCommitList(files, result.data.parent, result.next);
        }
    }
    return result;
}

function getListLen (list) {
    let len = 0;
    while (list) {
        len++;
        list = list.next
    }
    return len;
}

function getBlobBaseCommitSha (filesRef, commitSha) {
    const commitCon = parseJson(filesRef[commitSha].content);
    const treeCon = parseJson(filesRef[commitCon.tree].content);
    const filesArr = parseDirTreeToFilesArray(treeCon.metaData, [], { withSHA: true });
    let commitedFiles = {};
    filesArr.forEach(item => {
        commitedFiles[item.path] = item.SHA1;
    });
    return commitedFiles;
}

function getCommonNode (destList, sourceList) {
    let destListLen = getListLen(destList);
    let sourceListLen = getListLen(sourceList);
    let firstGoList = (destListLen > sourceListLen) ? destList : sourceList;
    let laterGoList = (destListLen > sourceListLen) ? sourceList : destList;
    let diff = (destListLen > sourceListLen) ? (destListLen - sourceListLen) : (sourceListLen - destListLen);
    let firstGoListHead = firstGoList;
    let laterGoListHead = laterGoList;
    if (diff) {
        for (let i = 0; i < diff; i++) {
            firstGoListHead = firstGoList.next;
        }
    }
    while (firstGoListHead && laterGoListHead && firstGoListHead.data.commit !== laterGoListHead.data.commit) {
        if (firstGoListHead.data.merges && firstGoListHead.data.merges[laterGoListHead.data.commit]) { // 有过merge记录的分支处理
            firstGoListHead = laterGoListHead;
            break;
        } else if (laterGoListHead.data.merges && laterGoListHead.data.merges[firstGoListHead.data.commit]) { // 有过merge记录的分支处理
            firstGoListHead = firstGoListHead;
            break;
        } else {
            firstGoListHead = firstGoListHead.next;
            laterGoListHead = laterGoListHead.next;
        }
    }
    return firstGoListHead;
}

function mergeBranch (branchname) {
    // 1.获取当前分支
    getHead().then(ref => {
        // 2.读取objects
        readfiles(`${workSpace()}/.gito/objects/`, {
            noSHA: true,
            exclude: ['.DS_Store'],
        }, function (err, obfiles) {
            if (err) {
                log.err(err);
            }
            const files = formatObFiles(obfiles);
            // console.log(files)
            // 获得当前分支最新的SHA1和需要合并分支最新的SHA1,通过SHA1获得对应的commit,以此得到该分支链表结构
            fs.readFile(ref.refFullPath, {encoding: 'utf8'}, (err, headCommit) => {
                if (err) {
                    log.err(err);
                }
                const destList = getCommitList(files, headCommit);
                // 获取需要合并分支的SHA1，获取分支链表结构
                fs.readFile(`${workSpace()}/.gito/refs/heads/${branchname}`, {encoding: 'utf8'}, (err, sourceheadCommit) => {
                    if (err) {
                        log.err(err);
                    }
                    const sourceList = getCommitList(files, sourceheadCommit);
                    // 根据得到的destList和sourceList拿到最近的共同点作为merge的base（先行法）
                    const commonNode = getCommonNode(destList, sourceList);
                    if (!commonNode) {
                        log.err('can not find common node of merge.')
                    }
                    // console.log('commonNode is:', commonNode)


                    // 3. 3-way merge algorithm
                    // dest -> base(common) <- source
                    // 3.1 通过commit检索对应blob的内容
                    // 类似此格式:{ '/workspace/a.txt': 'f0292d7e682a4ba6acfeb430be8187a69c4494d9' }
                    const commonBlobs = getBlobBaseCommitSha(files, commonNode.data.commit);
                    const destBlobs = getBlobBaseCommitSha(files, headCommit);
                    const sourceBlobs = getBlobBaseCommitSha(files, sourceheadCommit);
                    // console.log('commonBlobs is:', commonBlobs);
                    // console.log('destBlobs is:', destBlobs);
                    // console.log('sourceBlobs is:', sourceBlobs);

                    // 3.2 遍历commonBlobs，使用3-way merge
                    let conflictFiles = [];
                    for (let blobname in commonBlobs) {
                        if (destBlobs[blobname] && sourceBlobs[blobname]) {
                            const commonBlobCon = parseJson(files[commonBlobs[blobname]].content);
                            const destBlobCon = parseJson(files[destBlobs[blobname]].content);
                            const sourceBlobCon = parseJson(files[sourceBlobs[blobname]].content);
                            const result = merge(destBlobCon.content, commonBlobCon.content, sourceBlobCon.content);
                            const mergeResult = {
                                conflict: result.conflict,
                                result: result.result.join('')
                            }
                            console.log(mergeResult)
                            let writeFilesPromises = [];
                            let conflictWriteFilesPromise = [];
                            if (mergeResult.conflict) {
                                conflictFiles.push(blobname);
                                conflictWriteFilesPromise.push(Promise.resolve(
                                    new Promise((resolve, reject) => {
                                        fs.writeFile(blobname, mergeResult.result, (err) => {
                                            if(err) {
                                                reject(err);
                                            } else {
                                                resolve();
                                            }
                                        });
                                    })
                                ));
                            } else {
                                writeFilesPromises.push(Promise.resolve(
                                    new Promise((resolve, reject) => {
                                        fs.writeFile(blobname, mergeResult.result, (err) => {
                                            if(err) {
                                                reject(err);
                                            } else {
                                                resolve();
                                            }
                                        });
                                    })
                                ));
                            }
                            
                            Promise.all(writeFilesPromises).then(() => {
                                // 执行add，commit命令更新commit树
                                add().then(() => {
                                    commit(`merge ${branchname} to ${ref.curBranch}.`, sourceheadCommit).then(() => {
                                        if (conflictFiles.length) {
                                            Promise.all(conflictWriteFilesPromise).then(() => {
                                                conflictFiles.forEach(f => {
                                                    console.log(`CONFLICT (content): Merge conflict in ${f}`);
                                                });
                                                console.log(`merge failed; fix conflicts and then commit the result.`);
                                            });
                                        }
                                    });
                                });
                            });
                        }
                    }
                });
            });
        });
    })
}

module.exports = mergeBranch;