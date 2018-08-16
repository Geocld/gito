const fs = require('fs');
const crypto = require('crypto');
const zlib = require('zlib');
const log = require('./log');
const workSpace = require('./workSpace');

function jsonToString (j) {
    return JSON.stringify(j);
}

function parseJson (str) {
    return JSON.parse(str);
}

// 内容转SHA1
function getSHA1(content) {
    return crypto.createHash('sha1').update(content, 'utf8').digest('hex');
}

// 压缩zlib
function compress (content) {
    return zlib.gzipSync(content);
}

// 解压zlib数据
function uncompress (data) {
    return new Promise((resolve, reject) => {
        zlib.gunzip(data, function(err, dezipped) {
            if (err) {
                log.err(err);
            }
            resolve(dezipped.toString());
        });
    });
}

// 目录树铺平成文件路径数组
function parseDirTreeToFilesArray (tree, filesArray = [], options = {}) {
    if (tree.children && tree.children.length) {
        tree.children.forEach(item => {
            if (item.type === 'file') {
                if (options.withSHA) {
                    filesArray.push({
                        path: item.path,
                        SHA1: item.SHA1
                    });
                } else {
                    filesArray.push(item.path);
                }
            } else if (item.type === 'directory') {
                parseDirTreeToFilesArray(item, filesArray, options);
            }
        });
    }

    return filesArray;
}

// 获取SHA1文件目录树
function getShaTree (tree, filesSha) {
    if (tree.children && tree.children.length) {
        tree.children.forEach(item => {
            if (item.type === 'file') {
                item.SHA1 = filesSha[item.path].SHA1;
            } else if (item.type === 'directory') {
                getShaTree(item, filesSha);
            }
        });
    } 
    return tree;
}

// 计算目录层级的SHA1
function calcDirTreeSha (tree) {
    if (tree.children && tree.children.length) {
        tree.SHA1 = getSHA1(jsonToString(tree));
        tree.children.forEach(item => {
            if (item.type === 'directory') {
                calcDirTreeSha(item);
            }
        });
    }

    return tree;
}

function getHead () {
    return new Promise((resolve, reject) => {
        fs.readFile(workSpace() + '/.gito/HEAD', {encoding: 'utf8'}, (err, data) => {
            if (err) {
                log.err(err);
            }
            let ref = {};
            let refPath = data.split(':')[1].trim();
            let refPathArr = refPath.split('/');
            ref.curBranch = refPathArr[refPathArr.length - 1];
            ref.refFullPath = `${workSpace()}/.gito/${refPath}`;
            resolve(ref);
        });
    });
}


module.exports = {
    jsonToString,
    parseJson,
    getSHA1,
    compress,
    uncompress,
    parseDirTreeToFilesArray,
    getShaTree,
    calcDirTreeSha,
    getHead
}