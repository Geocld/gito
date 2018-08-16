const fs = require('fs');
const workSpace = require('./workSpace');
const log = require('./log');
const { jsonToString, parseJson, compress, uncompress } = require('./utils');

function readIndex () {
    return new Promise((resolve, reject) => {
        fs.readFile(workSpace() + '/.gito/index', function (err, data) {
            if (err) {
                resolve(null);
                return;
            }
            uncompress(data).then((str) => {
                resolve(parseJson(str));
            });
        });
    });
}

function writeIndex (data) {
    return new Promise((resolve, reject) => {
        const writeData = compress(jsonToString(data));
        fs.writeFile(workSpace() + '/.gito/index', writeData, function(err){
            if(err) log.err(err);
            resolve()
        });
    });
}

module.exports = {
    readIndex,
    writeIndex
};
