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
    boolean: ['h', 'e', 'i', 'c', 'd', 'f', 'm', 'no-parse-flag'],
    alias: { 'h': 'help', 'e': 'edit', 'i': 'insert', 'c': 'create', 'd': 'delete', 'n': 'index', 'f': 'force', 'm': 'move' },
    default: { 'n': 0 },
    stopEarly: false
};
let argRaw = process.argv.slice(2);
let args = parseArgs(argRaw, argOpts);
if (args['no-parse-flag']) {
    argOpts.stopEarly = true;
    args = parseArgs(argRaw, argOpts);
}

let scope = args._[0];
if (!scope) {
    print('Scope name cannot be empty.');
    process.exit(0);
}

if (args.help) {
    print(`
    Usage:
        pm <key> [<value>]
        pm <key> --edit
        pm <key> --delete
        pm --help
    `);
} else if (args.edit || args.insert || args.create) {
    // set
    let res = storage.set(scope, args.index, args._.slice(1, args._.length - 1), args._[args._.length - 1], args.insert, args.create, args.force);
    if (!res.success) {
        print(res.message);
    }
} else if (args.delete) {
    // delete
    let res = storage.delete(scope, args.index, args._.slice(1), args.force);
    if (!res.success) {
        print(res.message);
    }
} else if (args.move) {
    // move
    let scope1 = scope;
    let index1 = parseInt(args._[1]);
    let scope2, index2;
    if (args._.length === 3) {
        scope2 = scope1;
        index2 = parseInt(args._[2]);
    } else {
        scope2 = args._[2];
        index2 = parseInt(args._[3]);
    }
    if (isNaN(index1) || !scope2 || isNaN(index2)) {
        print('Invalid arguments.');
        process.exit(0);
    }
    let res = storage.move(scope1, index1, scope2, index2);
    if (!res.success) {
        print(res.message);
    }
} else {
    // get
    let res = storage.get(scope, args.index, args._.slice(1));
    if (res.success) {
        print(res.data);
    } else {
        print(res.message);
    }
}
