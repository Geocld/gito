const fs = require('fs');
const log = require('./lib/log');
const readfiles = require('./lib/readfiles');
const { parseJson, parseDirTreeToFilesArray, uncompress, getHead } = require('./lib/utils');
const workSpace = require('./lib/workSpace');

// checkout和reset操作需要到commit对象中查看已存储的文件对象进行还原
function checkoutFile (filename) {
    let commitSearchPath = '';
    let CommitCon = null;
    let tree = '';
    let treeSearchPath = '';
    let TreeCon = null;
    let filesArr = [];
    let BlobCon = null;
    let blobSearchPath;
    fs.exists(filename, e => {
        if (!e) {
            log.err('file does not exits');
        } else {
            // 1.读取head
            getHead().then(ref => {
                fs.readFile(ref.refFullPath, {encoding: 'utf8'}, (err, commitData) => {
                    if (err) {
                        log.err(err);
                    } else {
                        // 2. 遍历读取objects文件夹
                        readfiles(`${workSpace()}/.gito/objects/`, {
                            noSHA: true,
                            exclude: ['.DS_Store'],
                        }, function (err, files) {
                            if (err) {
                                log.err(err);
                            }
                            // 3.查找commit
                            commitSearchPath = `${workSpace()}/.gito/objects/${commitData.substring(0, 2)}/${commitData.substring(2)}`;
                            if (!files[commitSearchPath]) {
                                log.err(`Commit can not find ${commitSearchPath}`);
                            }
                            CommitCon = parseJson(files[commitSearchPath].content);
                            tree = CommitCon.tree;
                            // 4.查找tree
                            treeSearchPath = `${workSpace()}/.gito/objects/${tree.substring(0, 2)}/${tree.substring(2)}`;
                            if (!files[treeSearchPath]) {
                                log.err(`Tree can not find ${treeSearchPath}`);
                            }
                            // 这里拿到的是一个目录树结果，内含文件的SHA1，为了方便通过k-v的形式拿到文件的SHA1，需要把目录树铺平
                            TreeCon = parseJson(files[treeSearchPath].content);
                            filesArr = parseDirTreeToFilesArray(TreeCon.metaData, [], { withSHA: true });
                            filesArr.forEach(item => {
                                if (item.path === filename) {
                                    blobSearchPath = `${workSpace()}/.gito/objects/${item.SHA1.substring(0, 2)}/${item.SHA1.substring(2)}`;
                                }
                            });
                            if (!blobSearchPath) {
                                log.err(`Blob can not find`);
                            }
                            if (!files[blobSearchPath]) {
                                log.err(`Blob can not find ${blobSearchPath}`);
                            }
                            // 5.获取blob内容，还原
                            BlobCon = parseJson(files[blobSearchPath].content);
                            if (BlobCon.type !== 'blob') {
                                log.err(`${blobSearchPath} is not a blob`);
                            }
                            fs.writeFile(filename, BlobCon.content, (err, data) => {
                                if (err) {
                                    log.err(err);
                                } else {
                                    // console.log('success');
                                }
                            });
                        });
                    }
                });
            });
        }
    });
}

module.exports = checkoutFile;