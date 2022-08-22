#!/usr/bin/env node

const minimist = require('minimist');
const fs = require('fs');
const config = require('./config.js');
const storage = require('./storage.js');


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

function parseArgs() {
    const argOpts = {
        string: '_',
        boolean: ['search', 'edit', 'insert', 'create', 'delete', 'force', 'fuzzy', 'parse-flag', 'move', 'import', 'export', 'reset-passphrase', 'config', 'help', 'version'],
        alias: { 'index': 'n', 'search': 's', 'edit': ['e', 'm'], 'insert': 'i', 'create': 'c', 'delete': 'd', 'force': 'f', 'help': 'h', 'version': 'v' },
        default: { 'index': 0, 'fuzzy': true, 'parse-flag': true },
        stopEarly: false
    };
    let argRaw = process.argv.slice(2);
    let args = minimist(argRaw, argOpts);
    if (!args['parse-flag']) {
        argOpts.stopEarly = true;
        args = minimist(argRaw, argOpts);
    }
    return args;
}

function run(args) {
    if (args.help) {
        // help message
        print(`Your one-stop privacy manager.

Usage:
    pm [--no-fuzzy] [--no-parse-flag] <scope> [-n <index>] [<key chain>...]
    pm -s <text>...
    pm -e[f]|-m[f]|-i|-c|-d[f] [--no-parse-flag] <scope> [-n <index>] [<key chain>...] [<value>]
    pm --move [--no-parse-flag] <source scope> <source index> <target scope> <target index>
    pm --import|--export <file path>
    pm --reset-passphrase
    pm --config [<config key>] [<config value>]
    pm --help|--version

Options:
    -n <index>                 Index of document under the <scope>. Under query mode, string value "all" is allowed to fetch all. Under create mode, a new document would be created if index is out of range. Default: 0
    --index=<index>            Same as -n <index>.
    -s, --search               Search mode. Search scope(s) that contains object/sentence key by texts specified. All positional arguments are treated as a single string separated by white space. Fuzzy matching is enabled by default.
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
    --reset-passphrase         Reset encryption passphrase.
    --config                   List current configurations, set a user config entry by <config key> and <config value>, or reset a config entry by leaving <config value> empty.
    -h, --help                 Print this help message.
    -v, --version              Print version number.

PManager helps manage your secret information efficiently. Your private data is encrypted and stored securely. To access data, please set up and keep in mind your own passphrase.

"pm" command works under different modes by provided flags. If no flag is specified, pm is under query mode by default. It would fetch object or sentence value by specified <key chain> in the first document under the provided <scope>. <scope> query enables fuzzy matching by default (use "*" to fetch all scopes). One <scope> can have multiple documents which are distinguished by <index> value. A <document> contains nested objects and sentences which are key-value pairs with <value> being string that can be queried by <key chain>. <key chain> is a list of keys that are separated by white space.`
        );
    } else if (args.version) {
        // version number
        let package = JSON.parse(fs.readFileSync(`${__dirname}/../package.json`, 'utf8'));
        print(package.version);
    } else if (args.config) {
        // list/update configs
        if (args._.length > 0) {
            config.updateConfig(args._[0], args._[1]);
        } else {
            print(`User configuration file path: "${config.configPath}"`);
            print(config.config);
        }

    } else {
        if (args['reset-passphrase']) {
            // reset passphrase
            let res = storage.resetPassphrase();
            if (!res.success) {
                print(res.message);
            }
        } else if (args.search) {
            // search
            if (args._.length === 0) {
                print('Search texts cannot be missing.\nUse --help for more information.');
                process.exit(0);
            }
            let texts = args._.join(' ');
            let res = storage.search(texts, !args.fuzzy);
            if (res.success) {
                print(res.message);
                print(res.data);
            } else {
                print(res.message);
            }
        } else if (args.import || args.export) {
            // import/export data
            if (args._.length === 0) {
                print('File path cannot be missing.\nUse --help for more information.');
                process.exit(0);
            }
            let filePath = args._[0];
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
            if (args._.length === 0) {
                print('Scope name cannot be missing.\nUse --help for more information.');
                process.exit(0);
            }
            let scope = args._[0];
            if (scope === "*") {
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
    }
}

run(parseArgs());
