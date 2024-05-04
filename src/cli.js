#!/usr/bin/env node

import path from 'path';
import url from 'url';
import fs from 'fs';
import minimist from 'minimist';
import { print, helpMessage } from './utils.js';
import { config, configPath, updateUserConfig } from './config.js';
import storage from './storage.js';



function parseScopeIndex(name, defaultIndex = undefined) {
    const found = name.trim().match(/^(.*?)(?:\:(\d+))?$/);
    const scope = found[1];
    if (scope === '') {
        print('Scope name cannot be empty.\nUse --help for more information.');
        process.exit(0);
    }
    const index = found[2] ? parseInt(found[2]) : defaultIndex;
    return { scope, index };
}

function parseArgs() {
    const argOpts = {
        string: '_',
        boolean: ['search', 'edit', 'insert', 'create', 'delete', 'force', 'fuzzy', 'U', 'parse-flag', 'move', 'import', 'export', 'reset-passphrase', 'config', 'hashcode', 'help', 'version'],
        alias: { 'search': 's', 'edit': ['e', 'm'], 'insert': 'i', 'create': 'c', 'delete': 'd', 'force': 'f', 'help': 'h', 'version': 'v' },
        default: { 'n': undefined, 'fuzzy': true, 'parse-flag': true },
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
    // parse 'n'
    args.n = Number.isInteger(args.n) ? parseInt(args.n) : undefined;
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
        let res = storage.search(texts, args.n, !args.fuzzy);
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
            const { scope: scope1, index: index1 } = parseScopeIndex(args._[0], undefined);
            const { scope: scope2, index: index2 } = parseScopeIndex(args._[1], undefined);

            if (index1 === undefined && index2 === undefined) {
                // rename scope
                let res = storage.rename(scope1, scope2);
                if (!res.success) {
                    print(res.message);
                }
            } else if (index1 !== undefined && index2 !== undefined) {
                // move document
                let res = storage.move(scope1, index1, scope2, index2);
                if (!res.success) {
                    print(res.message);
                }
            } else {
                print('Mismatched index specified.\nUse --help for more information.');
                process.exit(0);
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
            ({ scope, index } = parseScopeIndex(args._[0], 1));
        } else {
            if (args._.length === 0) {
                scope = '';
                index = undefined;
            } else {
                ({ scope, index } = parseScopeIndex(args._[0], 'all'));
            }
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
            let res = storage.get(scope, index, args._.slice(1), args.n, !args.fuzzy);
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
