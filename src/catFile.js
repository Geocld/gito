const fs = require('fs');
const workSpace = require('./lib/workSpace');
const { parseJson, uncompress } = require('./lib/utils');
const log = require('./lib/log');

function catFile (sha1) {
    // TODO:sha1只需6~7位即可检索
    const objectsDir = workSpace() + '/.gito/objects/';
    const dirName = sha1.substring(0, 2);
    const fileName = sha1.substring(2);
    fs.exists(objectsDir + dirName, e => {
        if (!e) {
            log.err('file does not exist.');
        } else {
            fs.readFile(objectsDir + dirName + '/' + fileName, (err, data) => {
                if (err) {
                    log.err(err);
                } else {
                    uncompress(data).then((str) => {
                        console.log(parseJson(str));
                    });
                }
            });
        }
    });
}

module.exports = catFile;