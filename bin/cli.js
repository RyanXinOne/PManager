#!/usr/bin/env node
const storage = require('./storage.js');
const parseArgs = require('minimist');
const fs = require('fs');


function print(obj) {
    if (typeof obj === 'object') {
        console.log(JSON.stringify(obj, null, 2));
    } else {
        console.log(obj);
    }
}

const argOpts = {
    string: '_',
    boolean: ['help', 'version', 'edit', 'insert', 'create', 'delete', 'force', 'move', 'fuzzy', 'parse-flag', 'import', 'export'],
    alias: { 'help': 'h', 'version': 'v', 'edit': ['e', 'm'], 'insert': 'i', 'create': 'c', 'delete': 'd', 'index': 'n', 'force': 'f' },
    default: { 'n': 0, 'fuzzy': true, 'parse-flag': true },
    stopEarly: false
};
let argRaw = process.argv.slice(2);
let args = parseArgs(argRaw, argOpts);
if (!args['parse-flag']) {
    argOpts.stopEarly = true;
    args = parseArgs(argRaw, argOpts);
}

if (args.help) {
    // help message
    print(`Your one-stop privacy manager.

Usage:
    pm [--no-fuzzy] [--no-parse-flag] <scope> [-n <index>] [<key chain>...]
    pm -e[f]|-m[f]|-i|-c|-d[f] [--no-parse-flag] <scope> [-n <index>] [<key chain>...] [<value>]
    pm --move [--no-parse-flag] <source scope> <source index> <target scope> <target index>
    pm --import|--export <file path>
    pm --help|--version

Options:
    -n <index>                 Index of document to be updated under the <scope>, a new document would be created if value is out of range. Default: 0
    --index=<index>            Same as -n <index>.
    -e, -m, --edit             Modify existing key-value pair in a document by specified <key chain> and <value>.
    -i, --insert               Insert a new document into <index> specified instead of editing existing one. If specified, flag 'create' would be treated as true anyway.
    -c, --create               Create new object and key-value pair if any of them in <key chain> does not exist.
    -d, --delete               Delete a document or key-value pair by <key chain> specified. Empty scope would be cleaned automatically.
    -f, --force                Under editing mode, force to overwrite even if any key in <key chain> points to an existing object. Under deleting mode, force to delete even if the deleting target is an object.
    --move                     Move a document from one position to another. <Target scope> would be created if it does not exist. Source document would be deleted first and then be inserted into <target index> under <target scope>. Empty scope would be cleaned automatically.
    --no-fuzzy                 Disable fuzzy matching for scope.
    --no-parse-flag            If specified, any flag occurring after the first non-flag input would not be parsed.
    --import                   Import data from an external file.
    --export                   Export data to an external file.
    -h, --help                 Print this help message.
    -v, --version              Print version number.

If no flag is specified, pm would fetch value by specified <key chain> in the first document under <scope>. <scope> allows fuzzy querying by default (use empty scope "" to get all scopes). One <scope> can have multiple documents which are distinguished by <index> value. A <document> can only contain nested objects or key-value pair whose <value> is a string and can be accessed by <key chain>. <key chain> is a list of keys separated by white space.`
    );
} else if (args.version) {
    // version number
    let package = JSON.parse(fs.readFileSync(`${__dirname}/../package.json`, 'utf8'));
    print(package.version);
} else if (args.import || args.export) {
    // import/export data
    let filePath = args._[0];
    if (filePath === undefined) {
        print('File path cannot be missing.\nUse --help for more information.');
        process.exit(0);
    }
    let res;
    if (args.import) {
        res = storage.import(filePath);
    } else {
        res = storage.export(filePath);
    }
    if (!res.success) {
        print(res.message);
    }
} else {
    // pre-extraction
    let scope = args._[0];
    if (scope === undefined) {
        print('Scope name cannot be missing.\nUse --help for more information.');
        process.exit(0);
    }
    let index = parseInt(args.index);
    if (isNaN(index)) {
        print('Index must be a number.\nUse --help for more information.');
        process.exit(0);
    }

    if (args.edit || args.insert || args.create) {
        // set
        let res = storage.set(scope, index, args._.slice(1, args._.length - 1), args._[args._.length - 1], args.insert, args.create, args.force);
        if (!res.success) {
            print(res.message);
        }
    } else if (args.delete) {
        // delete
        let res = storage.delete(scope, index, args._.slice(1), args.force);
        if (!res.success) {
            print(res.message);
        }
    } else if (args.move) {
        // move
        let scope1 = scope;
        let index1 = index;
        let scope2, index2;
        if (args._.length === 3) {
            scope2 = scope1;
            index2 = parseInt(args._[2]);
        } else {
            scope2 = args._[2];
            index2 = parseInt(args._[3]);
        }
        if (scope2 === undefined || isNaN(index2)) {
            print('Invalid arguments.\nUse --help for more information.');
            process.exit(0);
        }
        let res = storage.move(scope1, index1, scope2, index2);
        if (!res.success) {
            print(res.message);
        }
    } else {
        // get
        let res = storage.get(scope, index, args._.slice(1), !args['fuzzy']);
        if (res.success) {
            print(res.message);
            print(res.data);
        } else {
            print(res.message);
        }
    }
}
