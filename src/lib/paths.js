const fs = require('fs');
const path = require('path');

// 找到目录下所有文件（包含子目录）
function paths (dir, options, callback) {
    options = options || {}
  
    let pending,
        results = {
            files: []
        };
  
    const done = function () {
      if (options.ignoreType) {
          results = results;
      } else {
        results = results['files'];
      }
      callback(null, results);
    };

    if (options.exclude && options.exclude.length) {
        for (let idx = 0; idx < options.exclude.length; idx++) {
            let regx = new RegExp(options.exclude[idx],'g')
            if (regx.test(dir)) {
                return done();
            }
        }
    }
  
    const getStatHandler = function (statPath, name, lstatCalled) {
        return function(err, stat) {
            if (err) {
                if (!lstatCalled) {
                    return fs.lstat(statPath, getStatHandler(statPath, name, true));
                }
                return callback(err);
            }
  
            let pushVal = statPath
  
            if (stat && stat.isDirectory() && stat.mode !== 17115) {

                const subloop = function(err, res) {
                    if (err){
                        return callback(err)
                    }

                    results.files = results.files.concat(res.files);

                    if (!--pending){
                        done();
                    }
                }

                let newOptions = Object.assign({}, options);
                newOptions.ignoreType = true
                paths(statPath, newOptions, subloop);
            } else {
                let isIgnore = false;
                if (options.exclude && options.exclude.length) {
                    for (let iidx = 0; iidx < options.exclude.length; iidx++) {
                        let regx = new RegExp(options.exclude[iidx],'g')
                        if (regx.test(pushVal)) {
                            isIgnore = true;
                        }
                    }
                }
                if (!isIgnore) {
                    results.files.push(pushVal);
                }
                if (!--pending) {
                    done()
                }
            }
        }
    };
  
    let bufdir = Buffer.from(dir);
  
    const onDirRead = function (err, list) {
        if (err) return callback(err);

        pending = list.length;
        if (!pending) return done();

        for (let file, i = 0, l = list.length; i < l; i++) {
            const fname = list[i].toString();
            file = path.join(dir, fname);
            const buffile = Buffer.concat([bufdir, Buffer.from(path.sep), list[i]]);

            fs.stat(buffile, getStatHandler(file,fname));
        }
        return results;
    };
  
    const onStat = function (err, stat) {
      if (err) return callback(err);
      if (stat && stat.mode === 17115) return done();
  
      fs.readdir(bufdir, {encoding: 'buffer'}, onDirRead);
    };
  
    fs.stat(bufdir, onStat);
}

module.exports = paths;