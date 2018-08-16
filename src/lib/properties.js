const fs = require('fs');
const log = require('./log');
const workSpace = require('./workSpace');

// 解析.properties配置文件
function properties () {
    const ignoreFile = workSpace() + '/.gitoignore';
    return new Promise((resolve, reject) => {
        fs.readFile(ignoreFile, {
            encoding: 'UTF-8'
        }, function (e, data) {
            if (e) {
                log.err('something got wrong, maybe ".gitoignore" file is not exits.');
            } else {
                const content = data;
                const conArr = content.split('\n');
                let matchConArr = [];
                conArr.forEach(con => {
                    if (con.length && !/^#/g.test(con)) {
                        matchConArr.push(con);
                    }
                });
                resolve(matchConArr);
            }
        });
    });
}

module.exports = properties;