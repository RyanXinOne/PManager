#!/usr/bin/env node
const storage = require('./storage.js');
const parseArgs = require('minimist');
const fs = require('fs');


const argOpts = {
    string: '_',
    boolean: ['help', 'version', 'search', 'edit', 'insert', 'create', 'delete', 'force', 'move', 'fuzzy', 'parse-flag', 'import', 'export'],
    alias: { 'help': 'h', 'version': 'v', 'search': 's', 'edit': ['e', 'm'], 'insert': 'i', 'create': 'c', 'delete': 'd', 'index': 'n', 'force': 'f' },
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
    pm -s <text>
    pm -e[f]|-m[f]|-i|-c|-d[f] [--no-parse-flag] <scope> [-n <index>] [<key chain>...] [<value>]
    pm --move [--no-parse-flag] <source scope> <source index> <target scope> <target index>
    pm --import|--export <file path>
    pm --help|--version

Options:
    -n <index>                 Index of document under the <scope>. Under query mode, string value "all" is allowed to fetch all. Under create mode, a new document would be created if index is out of range. Default: 0
    --index=<index>            Same as -n <index>.
    -s, --search               Search mode. Search scope(s) that contains object/sentence key by text specified. Fuzzy matching is enabled by default.
    -e, -m, --edit             Edit mode. Modify existing sentence in a document by specified <key chain> and <value>.
    -i, --insert               Insert a new document into <index> specified instead of editing existing one. If specified, flag 'create' would be treated as true anyway.
    -c, --create               Create mode. Create new object and sentence if any key in <key chain> does not exist.
    -d, --delete               Delete mode. Delete a document or sentence by <key chain> specified. Empty scope would be cleaned automatically.
    -f, --force                Under edit mode, force to overwrite even if any key in <key chain> points to an existing object. Under delete mode, force to delete even if the deleting target is an object.
    --no-fuzzy                 Disable fuzzy matching under query or search mode.
    --no-parse-flag            If specified, any flag occurring after the first non-flag input would not be parsed.
    --move                     Move a document from one position to another. <target scope> would be created if it does not exist. Source document would be deleted first and then be inserted into <target index> under <target scope>. Empty scope would be cleaned automatically.
    --import                   Import data from an external file.
    --export                   Export data to an external file.
    -h, --help                 Print this help message.
    -v, --version              Print version number.

If no flag is specified, pm is under query mode by default. It would fetch object or sentence value by specified <key chain> in the first document under the provided <scope>. <scope> query enables fuzzy matching by default (use "*" to fetch all scopes). One <scope> can have multiple documents which are distinguished by <index> value. A <document> contains nested objects and sentences which are key-value pairs with <value> being string that can be queried by <key chain>. <key chain> is a list of keys that are separated by white space.`
    );
} else if (args.version) {
    // version number
    let package = JSON.parse(fs.readFileSync(`${__dirname}/../package.json`, 'utf8'));
    print(package.version);
} else if (args.search) {
    // search
    let res = storage.search(args._[0], !args.fuzzy);
    if (res.success) {
        print(res.message);
        print(res.data);
    } else {
        print(res.message);
    }
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
    } else if (scope === "*") {
        scope = '';
    }
    let index;

    if (args.edit || args.insert || args.create) {
        // set
        index = parseIndex(args.index);
        let res = storage.set(scope, index, args._.slice(1, args._.length - 1), args._[args._.length - 1], args.insert, args.create, args.force);
        if (!res.success) {
            print(res.message);
        }
    } else if (args.delete) {
        // delete
        index = parseIndex(args.index);
        let res = storage.delete(scope, index, args._.slice(1), args.force);
        if (!res.success) {
            print(res.message);
        }
    } else if (args.move) {
        // move
        index = parseIndex(args.index);
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
        // query
        if (args.index === 'all') {
            index = args.index;
        } else {
            index = parseIndex(args.index);
        }
        let res = storage.get(scope, index, args._.slice(1), !args.fuzzy);
        if (res.success) {
            print(res.message);
            print(res.data);
        } else {
            print(res.message);
        }
    }
}

function print(obj) {
    if (typeof obj === 'object') {
        console.log(JSON.stringify(obj, null, 2));
    } else {
        console.log(obj);
    }
}

function parseIndex(indexIn) {
    let index = parseInt(indexIn);
    if (isNaN(index)) {
        print('Index can only be number or "all".\nUse --help for more information.');
        process.exit(0);
    }
    return index;
}
