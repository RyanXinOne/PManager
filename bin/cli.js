#!/usr/bin/env node
const storage = require('./storage.js');
const parseArgs = require('minimist');

function print(obj) {
    if (typeof obj === 'object') {
        console.log(JSON.stringify(obj, null, 2));
    } else {
        console.log(obj);
    }
}

const argOpts = {
    string: '_',
    boolean: ['h', 'e', 'd', 'f'],
    alias: {'h': 'help', 'e': ['m', 'edit'], 'd': 'delete', 'f': 'force'},
    default: {},
    stopEarly: false
};
let args = parseArgs(process.argv.slice(2), argOpts);

if (args.help) {
    print(`
    Usage:
        pm <key> [<value>]
        pm <key> --edit
        pm <key> --delete
        pm --help
    `);
} else if (args.edit) {
    // set
} else if (args.delete) {
    // delete
} else {
    // get
}
