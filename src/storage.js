import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import fetch from 'node-fetch';
import { print, readLines, askSecret } from './utils.js';
import { config } from './config.js';
import { setKey, encrypt, decrypt } from './encryption.js';


fs.mkdirSync(path.dirname(config.fileStoragePath), { recursive: true });

function _response(success, message = null, data = null) {
    return {
        success: success,
        message: message,
        data: data
    };
}

/**
 * Ask user passphrase and set up encryption key.
 */
function _setPassphraseByAsking() {
    let passphrase, passphrase2;
    do {
        passphrase = askSecret('Set passphrase (not displayed): ');
        passphrase2 = askSecret('Confirm passphrase (not displayed): ');
    } while (passphrase !== passphrase2);
    setKey(passphrase);
}

/**
 * Initialise data storage if non-existent. Set up initial user passphrase.
 */
function _setUpDataStorage() {
    if (!fs.existsSync(config.fileStoragePath)) {
        _setPassphraseByAsking();

        // write initial data
        const iniData = {
            "scopeDemo": [
                {
                    "name": "document1",
                    "description": "This is a sample document.",
                    "nestObj": {
                        "tmpKey": "fetch me by key chain `scopeDemo nestObj tmpKey`"
                    }
                }
            ]
        }
        let res = _writeData(iniData);
        if (!res.success) {
            console.error("Failed to initialise data storage: %s", res.message);
            process.exit(0);
        }
    }
}

function _readData() {
    _setUpDataStorage();
    let data;
    try {
        let dataBuf = fs.readFileSync(config.fileStoragePath);
        data = decrypt(dataBuf);
        data = JSON.parse(data);
    } catch (err) {
        return _response(false, err.message);
    }
    return _response(true, null, data);
}

function _writeData(data) {
    try {
        data = JSON.stringify(data);
        let dataBuf = encrypt(data);
        fs.writeFileSync(config.fileStoragePath, dataBuf);
    } catch (err) {
        return _response(false, err.message);
    }
    return _response(true);
}

/**
 * Fetch document or object by scope, index, and key chain specified.
 * 
 * @param {string} scope scope name
 * @param {Integer | string} index index of document to be fetched under the scope, string value "all" returns all documents under the scope
 * @param {Array.<string>} keyChain key chain of document
 * @param {Integer} candidateN optional, the index of candidate scope to be returned when multiple scopes are found
 * @param {boolean} noFuzzy whether to disable fuzzy matching
 */
function get(scope, index, keyChain, candidateN = undefined, noFuzzy = false) {
    let data = _readData();
    if (data.success) {
        data = data.data;
    } else {
        return data;
    }
    let document = data;
    // query scope
    let scopes = _queryDataStore(scope, document, noFuzzy);
    let candidateScope;
    switch (scopes.length) {
        case 0:
            return _response(false, `No scope found.`);
        case 1:
            candidateScope = scopes[0];
            break;
        default:
            if (Number.isInteger(candidateN)) {
                // candidate scope selection
                if (candidateN < 1 || candidateN > scopes.length) {
                    return _response(true, `${scopes.length} scopes found. Invalid candidate number ${candidateN}.`, { 'type': 'scope', 'data': scopes });
                }
                candidateScope = scopes[candidateN - 1];
                break;
            } else {
                return _response(true, `${scopes.length} scopes found. Select candidate scope with flag "-n", or add "-U" for exact matching.`, { 'type': 'scope', 'data': scopes });
            }
    }
    document = document[candidateScope];
    if (index === 'all') {
        let objs = [];
        for (const doc of document) {
            let res = _queryDoc(keyChain, doc);
            if (res.success) {
                objs.push(res.data);
            }
        }
        switch (objs.length) {
            case 0:
                return _response(false, `No compliant objects found under scope "${candidateScope}".`);
            case 1:
                return _response(true, `Scope: "${candidateScope}"`, { 'type': 'object', 'data': objs[0] });
            default:
                return _response(true, `Scope: "${candidateScope}", ${objs.length} documents/objects found`, { 'type': 'object', 'data': objs });
        }
    } else {
        index -= 1;
        // check existence of index
        if (document[index] === undefined) {
            return _response(false, `Scope "${candidateScope}" does not have index ${index + 1}.`);
        }
        let size = document.length;
        document = document[index];
        let res = _queryDoc(keyChain, document);
        if (res.success) {
            return _response(true, `Scope: "${candidateScope}"` + (size > 1 ? `, document ${index + 1} (${size} in total)` : ''), { 'type': 'object', 'data': res.data });
        } else {
            return res;
        }
    }
}

/**
 * Fuzzy query scope(s) from dataStore.
 */
function _queryDataStore(targetScope, dataStore, noFuzzy) {
    let res = [];
    if (noFuzzy) {
        if (targetScope in dataStore) {
            res.push(targetScope);
        }
    } else {
        targetScope = targetScope.toLowerCase();
        for (const scope in dataStore) {
            let lowerScope = scope.toLowerCase();
            if (lowerScope.indexOf(targetScope) > -1) {
                res.push(scope);
            }
        }
    }
    return res;
}

function _queryDoc(keyChain, document) {
    let obj = document;
    for (let i = 0; i < keyChain.length; i++) {
        // iterate into nested object
        obj = obj[keyChain[i]];
        // check undefined
        if (obj === undefined) {
            return _response(false, `Key "${keyChain.slice(0, i + 1).join('.')}" does not exist.`);
        }
    }
    // get value by sentence key
    return _response(true, null, obj);
}

/**
 * Modify existing sentence in document by key chain and value specified.
 * 
 * @param {string} scope scope name
 * @param {Integer} index index of document to be updated under the scope, a new document would be created if out of range
 * @param {Array.<string>} keyChain key chain of document
 * @param {string} value value to be set
 * @param {boolean} insert insert new document into index instead of editing existing one. If true, flag `create` would be treated as true anyway
 * @param {boolean} create create new object and sentence if any of them in key chain does not exist
 * @param {boolean} force force to overwrite even if any key in key chain points to an existing object
 */
function set(scope, index, keyChain, value, insert = false, create = false, force = false) {
    if (insert) create = true;

    let data = _readData();
    if (data.success) {
        data = data.data;
    } else {
        return data;
    }
    let document = data;
    // check existence of scope
    if (document[scope] === undefined) {
        if (create) {
            document[scope] = [];
        } else {
            return _response(false, `Scope "${scope}" does not exist.`);
        }
    }
    document = document[scope];
    index -= 1;
    // check existence of index
    if (document[index] === undefined) {
        if (create) {
            index = document.push({}) - 1;
        } else {
            return _response(false, `Scope "${scope}" does not have index ${index + 1}.`);
        }
    } else {
        if (insert) {
            // insert new document
            document.splice(index, 0, {});
        }
    }
    document = document[index];
    let res = _updateDoc(keyChain, value, document, create, force);
    return res.success ? _writeData(data) : res;
}

function _updateDoc(keyChain, value, document, create, force) {
    // check key chain
    if (keyChain.length === 0) {
        return _response(false, 'Key chain cannot be missing.');
    }
    let obj = document;
    let i;
    for (i = 0; i < keyChain.length - 1; i++) {
        // check existence of key
        if (obj[keyChain[i]] === undefined) {
            if (create) {
                obj[keyChain[i]] = {};
            } else {
                return _response(false, `Key "${keyChain.slice(0, i + 1).join('.')}" does not exist.`);
            }
        }
        // iterate into nested object
        obj = obj[keyChain[i]];
    }
    // check existence of sentence and update
    if (obj.hasOwnProperty(keyChain[i])) {
        if (!create) {
            // check if the last key points to an object
            if (typeof obj[keyChain[i]] === 'object' && !force) {
                return _response(false, `Not allowed to overwrite object under "${keyChain.join('.')}".`);
            }
            obj[keyChain[i]] = value;
        } else {
            return _response(false, `Key "${keyChain.join('.')}" already exists.`);
        }
    } else {
        if (create) {
            obj[keyChain[i]] = value;
        } else {
            return _response(false, `Key "${keyChain.join('.')}" does not exist.`);
        }
    }
    return _response(true);
}

/**
 * Delete sentence or empty object by key chain specified. Empty document and scope would be cleaned automatically.
 * 
 * @param {string} scope scope name
 * @param {Integer} index index of document to be deleted from the scope
 * @param {Array.<string>} keyChain key chain of document, empty array means deleting the whole document given that `force` mode is enabled
 * @param {boolean} force force to delete even if the deleting target is an object
 */
function delete_(scope, index, keyChain, force = false) {
    let data = _readData();
    if (data.success) {
        data = data.data;
    } else {
        return data;
    }
    let document = data;
    index -= 1;
    // check existence of scope and index
    if (document[scope] === undefined || document[scope][index] === undefined) {
        return _response(false, `Scope "${scope}" or index ${index + 1} does not exist.`);
    }
    document = document[scope];
    if (keyChain.length > 0) {
        let res = _deleteDoc(keyChain, document[index], force);
        if (!res.success) {
            return res;
        }
    } else {
        if (!force) {
            return _response(false, `Not allowed to delete document with index ${index + 1} under scope "${scope}".`);
        }
    }
    // clean empty document or force to delete
    if (Object.keys(document[index]).length === 0 || force) {
        document.splice(index, 1);
        // clean empty scope
        if (document.length === 0) {
            delete data[scope];
        }
    }
    return _writeData(data);
}

function _deleteDoc(keyChain, document, force) {
    let obj = document;
    let i;
    for (i = 0; i < keyChain.length - 1; i++) {
        // iterate into nested object
        obj = obj[keyChain[i]];
        // check existence
        if (obj === undefined) {
            return _response(false, `Key "${keyChain.slice(0, i + 1).join('.')}" does not exist.`);
        }
    }
    // check existence
    if (!(keyChain[i] in obj)) {
        return _response(false, `Key "${keyChain.join('.')}" does not exist.`);
    }
    // check non-empty object
    if (typeof obj[keyChain[i]] === 'object' && Object.keys(obj[keyChain[i]]).length > 0 && !force) {
        return _response(false, `Not allowed to delete non-empty object under "${keyChain.join('.')}".`);
    }
    // delete sentence or empty object
    delete obj[keyChain[i]];
    return _response(true);
}

/**
 * Search for scopes that contain object/sentence key-values by text specified.
 * 
 * @param {string} text text to be matched
 * @param {Integer} candidateN optional, the index of candidate scope to be returned when multiple scopes are found
 * @param {boolean} noFuzzy whether to disable fuzzy matching
 */
function search(text, candidateN = undefined, noFuzzy = false) {
    let data = _readData();
    if (data.success) {
        data = data.data;
    } else {
        return data;
    }
    if (!noFuzzy) {
        text = text.toLowerCase();
    }
    let scopes = [];
    // iterate over all scopes
    for (const scope in data) {
        let documents = data[scope];
        // iterate over all documents
        for (const doc of documents) {
            // search document
            if (_searchObj(doc, text, noFuzzy)) {
                scopes.push(scope);
                break;
            }
        }
    }
    // return scopes search result
    switch (scopes.length) {
        case 0:
            return _response(false, `No matching scope found by searching "${text}".`);
        case 1:
            return get(scopes[0], "all", [], undefined, true);
        default:
            if (Number.isInteger(candidateN)) {
                // candidate scope selection
                if (candidateN < 1 || candidateN > scopes.length) {
                    return _response(true, `${scopes.length} matching scopes found. Invalid candidate number ${candidateN}.`, { 'type': 'scope', 'data': scopes });
                }
                return get(scopes[candidateN - 1], "all", [], undefined, true);
            } else {
                return _response(true, `${scopes.length} matching scopes found. Select candidate scope with flag "-n".`, { 'type': 'scope', 'data': scopes });
            }
    }
}

function _searchObj(obj, text, noFuzzy) {
    // iterate over object
    for (const key in obj) {
        // match object/sentence key
        if (!noFuzzy) {
            if (key.toLowerCase().indexOf(text) > -1) {
                return true;
            }
        } else {
            if (key === text) {
                return true;
            }
        }
        // match sentence value
        if (typeof obj[key] === 'string') {
            if (!noFuzzy) {
                if (obj[key].toLowerCase().indexOf(text) > -1) {
                    return true;
                }
            } else {
                if (obj[key] === text) {
                    return true;
                }
            }
        }
        // recurse into nested object
        if (Object.prototype.toString.call(obj[key]) === Object.prototype.toString.call({})) {
            if (_searchObj(obj[key], text, noFuzzy)) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Rename a scope. The source scope must exist and the target scope must not exist.
 * 
 * @param {string} scope1 source scope name
 * @param {string} scope2 target scope name
 */
function rename(scope1, scope2) {
    let data = _readData();
    if (data.success) {
        data = data.data;
    } else {
        return data;
    }
    // check existence of source scope
    if (data[scope1] === undefined) {
        return _response(false, `Source scope "${scope1}" does not exist.`);
    }
    // check existence of target scope
    if (data[scope2] !== undefined) {
        return _response(false, `Target scope "${scope2}" already exists.`);
    }
    // rename scope
    let document = data[scope1];
    delete data[scope1];
    data[scope2] = document;
    return _writeData(data);
}

/**
 * Move a document from one position to another. Target scope would be created if it does not exist. Source document would be deleted first and then be inserted into target index under target scope. Empty scope would be deleted automatically.
 * 
 * @param {string} scope1 source scope name
 * @param {Integer} index1 source index
 * @param {string} scope2 target scope name
 * @param {Integer} index2 target index
 */
function move(scope1, index1, scope2, index2) {
    let data = _readData();
    if (data.success) {
        data = data.data;
    } else {
        return data;
    }
    let document = data;
    index1 -= 1;
    index2 -= 1;
    // check existence of source scope and index
    if (document[scope1] === undefined || document[scope1][index1] === undefined) {
        return _response(false, `Source scope "${scope1}" or index ${index1 + 1} does not exist.`);
    }
    document = document[scope1][index1];
    // delete source document
    data[scope1].splice(index1, 1);
    // insert into target position
    if (data[scope2] === undefined) {
        data[scope2] = [];
    }
    if (data[scope2][index2] === undefined) {
        data[scope2].push(document);
    } else {
        data[scope2].splice(index2, 0, document);
    }
    // clean empty source scope
    if (data[scope1].length === 0) {
        delete data[scope1];
    }

    return _writeData(data);
}

/**
 * Import data from web URL, local JSON file or stdin. JSON structure is checked to ensure compliance.
 * 
 * @param {string} url optional, web url or path to JSON file
 */
async function import_(url = null) {
    // read data to authenticate before proceeding
    _readData();
    let data;
    try {
        if (url === null) {
            // read json data from stdin
            data = readLines();
            data = JSON.parse(data);
        } else if (url.startsWith('http://') || url.startsWith('https://')) {
            // fetch json data from web
            const response = await fetch(url);
            data = await response.json();
        } else {
            // read json data from file
            data = fs.readFileSync(url, 'utf8');
            data = JSON.parse(data);
        }
    } catch (err) {
        return _response(false, err.message);
    }
    // check json structure
    if (Object.prototype.toString.call(data) !== Object.prototype.toString.call({})) {
        return _response(false, 'Non-compliant data input.');
    }
    // a helper function
    let consistsOfObjectsOnly = (obj) => {
        let queue = [obj];
        while (queue.length > 0) {
            let obj = queue.shift();
            if (Object.prototype.toString.call(obj) !== Object.prototype.toString.call({})) {
                return false;
            }
            for (const key in obj) {
                if (typeof obj[key] !== 'string') {
                    queue.push(obj[key]);
                }
            }
        }
        return true;
    };
    for (const scope in data) {
        let documents = data[scope];
        // check non-empty scope
        if (!Array.isArray(documents) || documents.length === 0) {
            return _response(false, 'Non-compliant data input.');
        }
        for (let i = 0; i < documents.length; i++) {
            // check non-empty document
            if (Object.prototype.toString.call(documents[i]) !== Object.prototype.toString.call({}) || Object.keys(documents[i]).length === 0) {
                return _response(false, 'Non-compliant data input.');
            }
            // check objects
            if (!consistsOfObjectsOnly(documents[i])) {
                return _response(false, 'Non-compliant data input.');
            }
        }
    }
    return _writeData(data);
}

/**
 * Export data to JSON file or stdout.
 * 
 * @param {string} filePath optional, path to JSON file
 */
function export_(filePath = null) {
    let data = _readData();
    if (data.success) {
        data = data.data;
    } else {
        return data;
    }
    data = JSON.stringify(data, null, 2);
    if (filePath !== null) {
        // write json data to file
        try {
            fs.writeFileSync(filePath, data, 'utf8');
        } catch (err) {
            return _response(false, err.message);
        }
    } else {
        // write json data to stdout
        print(data);
    }
    return _response(true);
}

/**
 * Reset user passphrase.
 */
function resetPassphrase() {
    let data = _readData();
    if (data.success) {
        data = data.data;
    } else {
        return data;
    }
    _setPassphraseByAsking();
    return _writeData(data);
}

/**
 * Generate hashcode of data.
 */
function hashcode() {
    let data = _readData();
    if (data.success) {
        data = data.data;
    } else {
        return data;
    }
    let hash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    return _response(true, null, hash);
}

export default { get, set, delete_, search, rename, move, import_, export_, resetPassphrase, hashcode };
export { get, set, delete_, search, rename, move, import_, export_, resetPassphrase, hashcode };
