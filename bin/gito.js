#!/usr/bin/env node
const program = require('commander');
const init = require('../src/init');
const status = require('../src/status');
const add = require('../src/add');
const commit = require('../src/commit');
const checkoutFile = require('../src/checkoutFile');
const reset = require('../src/reset');
const catFile = require('../src/catFile');
const branch = require('../src/branch');
const mergeBranch = require('../src/merge');

program
    .version('0.0.1', '-v, --version')
    .option('i, init', 'init gito')
    .option('status', 'check status of files')
    .option('add', 'add file to index')
    .parse(process.argv);


// gito commit -m "you commit description"
program
    .command('commit')
    .description('commit file to gito')
    .option('-m, --mark <desc>', 'description')
    .action((options) => {
        commit(options.mark);
    });

// 单文件还原
// gito checkout -f 'filename'
program
    .command('checkout')
    .description('commit file to gito')
    .option('-f, --file <filename>', 'filename')
    .action((options) => {
        if (options.file) {
            checkoutFile(options.file);
        }
    });

// 将指针还原
// gito reset --hard
program
    .command('reset')
    .description('reset file to head')
    .option('-h, --hard', 'reset hard')
    .action((options) => {
        if (options.hard) {
            reset();
        }
    });

// 分支操作
program
    .command('branch')
    .description('operating of branch')
    .option('-d, --delete <branchname>', 'delete a branch')
    .option('-l, --list', 'show all branches')
    .option('-s, --switch <branchname>', 'switch branch')
    .action(option => {
        if (typeof option === 'string' && !!option) {
            branch.createBranch(option);
        } else if (typeof option === 'object') {
            if (option.delete) {
                branch.deleteBranch(option.delete);
            }
            if (option.list) {
                branch.listBranch();
            }
            if (option.switch) {
                branch.switchBranch(option.switch);
            }
        }
    });

// 分支合并
program
    .command('merge')
    .description('merge branch')
    .action(option => {
        if (typeof option === 'string') {
            mergeBranch(option);
        }
    });

// gito cat-file -p SHA1
program
    .command('cat-file')
    .description('cat file schema')
    .option('-p, --p <SHA1>', 'SHA1')
    .action((options) => {
        catFile(options.p);
    });

program.parse(process.argv);


// gito init
if (program.init) {
    init();
}

//  gito status
if (program.status) {
    status();
}

// gito add
if (program.add) {
    add();
}
