// gito add
const fs = require('fs');
const shell = require('shelljs');
const { readIndex, writeIndex }  = require('./lib/indexController');
const workSpace = require('./lib/workSpace');
const properties = require('./lib/properties');
const readfiles = require('./lib/readfiles');
const log = require('./lib/log');
const { jsonToString, parseJson, compress, uncompress } = require('./lib/utils');

function add () {
    return new Promise((resolve, reject) => {
        properties().then(data => {
            readfiles(workSpace(), {
                exclude: data,
                excludeDir: data,
            }, function (err, files) {
                if (err) {
                    log.err(err);
                }
                // console.log('finished reading files:',files);
                let filesWithoutContent = parseJson(jsonToString(files));
                for (let k in filesWithoutContent) {
                    delete filesWithoutContent[k].metaData
                }
                // 1.将文件信息写入index
                writeIndex(filesWithoutContent).then(() => {
                    console.log('Index write succeeded.')
                });
                // 2.在object中生成相应的blob
                let writeBlobPromises = [];
                for (let kf in files) {
                    const filename = workSpace() + '/.gito/objects/' + files[kf].SHA1.substring(0, 2) + '/' + files[kf].SHA1.substring(2);
                    const content = compress(jsonToString(files[kf].metaData));
                    shell.mkdir(workSpace() + '/.gito/objects/' + files[kf].SHA1.substring(0, 2));
                    writeBlobPromises.push(Promise.resolve(
                        new Promise((resolve, reject) => {
                            fs.writeFile(filename, content, (err) => {
                                if(err) {
                                    reject(err);
                                } else {
                                    resolve();
                                }
                            });
                        })
                    ));
                }
    
                Promise.all(writeBlobPromises).then(() => {
                    console.log('Blob write succeeded');
                    resolve();
                });
            });
        });
    });
}

module.exports = add;
