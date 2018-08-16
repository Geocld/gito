const colors = require('colors');

module.exports = {

    err (msg) {
        console.log('\n' + colors.red('[gito Error]: ' + msg) + '\n');
        process.exit();
    },

    Untracked (msg) {
        console.log(colors.red(msg));
    },

    green (msg) {
        console.log(colors.green(msg));
    },

    deleted (msg) {
        console.log(colors.red(msg));
    }
}