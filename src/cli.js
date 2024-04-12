#!/usr/bin/env node

import path from 'path';
import url from 'url';
import fs from 'fs';
import minimist from 'minimist';
import { print, helpMessage } from './utils.js';
import { config, configPath, updateUserConfig } from './config.js';
import storage from './storage.js';


function parseScope(scopeIn) {
    scopeIn = scopeIn.trim();
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
        boolean: ['search', 'edit', 'insert', 'create', 'delete', 'force', 'fuzzy', 'U', 'parse-flag', 'move', 'import', 'export', 'reset-passphrase', 'config', 'hashcode', 'help', 'version'],
        alias: { 'index': 'n', 'search': 's', 'edit': ['e', 'm'], 'insert': 'i', 'create': 'c', 'delete': 'd', 'force': 'f', 'help': 'h', 'version': 'v' },
        default: { 'index': undefined, 'fuzzy': true, 'parse-flag': true },
        stopEarly: false
    };
    let argRaw = process.argv.slice(2);
    let args = minimist(argRaw, argOpts);
    if (!args['parse-flag']) {
        argOpts.stopEarly = true;
        args = minimist(argRaw, argOpts);
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
        print(helpMessage);
    } else if (args.version) {
        // version number
        const packageInfo = JSON.parse(fs.readFileSync(path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..', 'package.json'), 'utf8'));
        print(packageInfo.version);
    } else if (args.config) {
        // list/update configs
        if (args._.length > 0) {
            updateUserConfig(args._[0], args._[1]);
        } else {
            print(`User configuration file path: "${configPath}"`);
            print(config);
        }
    } else if (args['reset-passphrase']) {
        // reset passphrase
        let res = storage.resetPassphrase();
        if (!res.success) {
            print(res.message);
        }
    } else if (args.hashcode) {
        // hashcode
        let res = storage.hashcode();
        if (!res.success) {
            print(res.message);
        } else {
            let code = BigInt('0x' + res.data).toString().substring(0, 6);
            print(code);
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
        let url = args._.length === 0 ? null : args._[0];
        let res;
        if (args.import) {
            res = storage.import_(url);
        } else {
            res = storage.export_(url);
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
        // parse scope and index
        let scope, index;
        if (args.edit || args.insert || args.create || args.delete) {
            if (args._.length === 0) {
                print('Scope name cannot be missing.\nUse --help for more information.');
                process.exit(0);
            }
            scope = parseScope(args._[0]);
            index = parseIndex(args.index === undefined ? '0' : args.index);
        } else {
            scope = args._.length === 0 ? '' : parseScope(args._[0]);
            index = parseIndex(args.index === undefined ? 'all' : args.index, true);
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
            let res = storage.delete_(scope, index, args._.slice(1), args.force);
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

run();
