#!/usr/bin/env node

const minimist = require('minimist');
const fs = require('fs');
const config = require('./config.js');
const storage = require('./storage.js');
const { print } = require('./utils.js');


function parseScope(scopeIn, allowWildcard = false) {
    scopeIn = scopeIn.trim();
    if (scopeIn === '*') {
        if (allowWildcard) {
            return '';
        } else {
            print('Scope name cannot be "*".\nUse --help for more information.');
            process.exit(0);
        }
    }
    if (scopeIn === '') {
        print('Scope name cannot be empty.\nUse --help for more information.');
        process.exit(0);
    }
    return scopeIn;
}

function parseIndex(indexIn, allowAll = false) {
    if (allowAll && indexIn === 'all') {
        return indexIn;
    }
    let index = parseInt(indexIn);
    if (isNaN(index)) {
        print('Index can only be a number.\nUse --help for more information.');
        process.exit(0);
    }
    return index;
}

function parseArgs() {
    const argOpts = {
        string: '_',
        boolean: ['A', 'search', 'edit', 'insert', 'create', 'delete', 'force', 'fuzzy', 'U', 'parse-flag', 'move', 'import', 'export', 'reset-passphrase', 'config', 'help', 'version'],
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
    if (args.A) {
        args.index = 'all';
    }
    if (args.U) {
        args.fuzzy = false;
    }
    return args;
}

function run() {
    const args = parseArgs();
    if (args.help) {
        // help message
        print(`PManager helps manage your secret information securely. Your private data is encrypted and stored in a secure manner. To access the data, set up and remember your own passphrase.

Usage:
    pm [--no-fuzzy] [--no-parse-flag] <scope> [-n <index>] [<key chain>...]
    pm -s <text>...
    pm -e[f]|-m[f]|-i|-c|-d[f] [--no-parse-flag] <scope> [-n <index>] [<key chain>...] [<value>]
    pm --move [--no-parse-flag] <source scope> [<source index>] <target scope> [<target index>]
    pm --import|--export [<file path>]
    pm --reset-passphrase
    pm --config [<config key>] [<config value>]
    pm --help|--version

Options:
    -n <index>                 The index of the document under the <scope>. Use "all" in query mode to fetch all documents, if the index is out of range in create mode, a new document will be created. The default value is 0.
    --index=<index>            Same as "-n <index>".
    -A                         Alias to "-n all".
    -s, --search               Search mode. Search scope(s) containing object/sentence key by specified texts. All positional arguments are treated as a single string separated by white space. Fuzzy matching is enabled by default.
    -e, -m, --edit             Edit mode. Modify an existing sentence in a document by specifying <key chain> and <value>.
    -i, --insert               Insert mode. Insert a new document into the specified <index> instead of editing an existing one. If specified, the flag "--create" would be treated as true anyway.
    -c, --create               Create mode. Create a new object and sentence if any key in <key chain> does not exist.
    -d, --delete               Delete mode. Delete a sentence by the specified <key chain>. An empty document and scope would be cleaned automatically.
    -f, --force                Under edit mode, force to overwrite even if any key in <key chain> points to an existing object. Under delete mode, force to delete even if the deleting target is a document or non-empty object.
    -U, --no-fuzzy             Disable fuzzy matching under query or search mode.
    --no-parse-flag            If specified, any flag occurring after the first non-flag input would not be parsed.
    --move                     If <source index> and <target index> are given, move a document from one index position to another. <target scope> would be created if it does not exist. The source document would be deleted first and then inserted into <target index> under <target scope>. An empty scope would be cleaned automatically. If <source index> and <target index> are not given, <source scope> is renamed into <target scope>.
    --import                   Import data from a file. If <file path> is omitted, read from standard input.
    --export                   Export data to a file. If <file path> is omitted, write to standard output.
    --reset-passphrase         Reset encryption passphrase.
    --config                   List current configurations, set a user config entry by <config key> and <config value>, or reset a config entry by leaving <config value> empty.
    -h, --help                 Print this help message.
    -v, --version              Print version number.

The "pm" command works under different modes based on the provided flags. If no flag is specified, "pm" is under query mode by default. It fetches the object or sentence value by the specified <key chain> in the first document under the provided <scope>. The <scope> query enables fuzzy matching by default (use "*" to fetch all scopes). One <scope> can have multiple documents that are distinguished by the <index> value. A <document> contains nested objects and sentences, which are key-value pairs with <value> being a string that can be queried by <key chain>. The <key chain> is a list of keys separated by white space.`
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
            let filePath = args._.length === 0 ? null : args._[0];
            let res;
            if (args.import) {
                res = storage.import(filePath);
            } else {
                res = storage.export(filePath);
            }
            if (!res.success) {
                print(res.message);
            }
        } else if (args.move) {
            // move a document or rename a scope
            if (args._.length === 2) {
                // rename scope
                let scope1 = parseScope(args._[0]);
                let scope2 = parseScope(args._[1]);
                let res = storage.rename(scope1, scope2);
                if (!res.success) {
                    print(res.message);
                }
            } else if (args._.length === 4) {
                // move document
                let scope1 = parseScope(args._[0]);
                let index1 = parseIndex(args._[1]);
                let scope2 = parseScope(args._[2]);
                let index2 = parseIndex(args._[3]);
                let res = storage.move(scope1, index1, scope2, index2);
                if (!res.success) {
                    print(res.message);
                }
            } else {
                print('Invalid number of arguments.\nUse --help for more information.');
                process.exit(0);
            }
        } else {
            // check scope
            if (args._.length === 0) {
                print('Scope name cannot be missing.\nUse --help for more information.');
                process.exit(0);
            }
            // parse scope and index
            let scope, index;
            if (args.edit || args.insert || args.create || args.delete) {
                scope = parseScope(args._[0]);
                index = parseIndex(args.index);
            } else {
                scope = parseScope(args._[0], true);
                index = parseIndex(args.index, true);
            }

            // business operation
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
            } else {
                // query
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

run();
