const config = require('./config.js');
const enc = require('./encryption.js');
const path = require('path');
const fs = require('fs');


function response(success, message = null, data = null) {
    return {
        success: success,
        message: message,
        data: data
    };
}

function readData() {
    const filePath = config.fileStoragePath;
    let data;
    try {
        let dataBuf = fs.readFileSync(filePath);
        data = enc.decrypt(dataBuf);
        data = JSON.parse(data);
    } catch (err) {
        return response(false, err.message);
    }
    return response(true, null, data);
}

function writeData(data) {
    const filePath = config.fileStoragePath;
    try {
        data = JSON.stringify(data);
        let dataBuf = enc.encrypt(data);
        fs.writeFileSync(filePath, dataBuf);
    } catch (err) {
        return response(false, err.message);
    }
    return response(true);
}

/**
 * Fetch document or object by scope, index, and key chain specified.
 * 
 * @param {string} scope scope name
 * @param {Integer | string} index index of document to be fetched under the scope, string value "all" returns all documents under the scope
 * @param {Array.<string>} keyChain key chain of document
 * @param {boolean} noFuzzy whether to disable fuzzy matching
 */
function _get(scope, index, keyChain, noFuzzy = false) {
    let data = readData();
    if (data.success) {
        data = data.data;
    } else {
        return data;
    }
    let document = data;
    // query scope
    let scopes = _queryDataStore(scope, document, noFuzzy);
    switch (scopes.length) {
        case 0:
            return response(false, `Scope "${scope}" does not exist.`);
        case 1:
            document = document[scopes[0]];
            break;
        default:
            return response(true, `${scopes.length} scopes found. Please specify which one you want, or add flag "--no-fuzzy" for exact matching.`, scopes);
    }
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
                return response(false, `No compliant objects found under scope "${scopes[0]}".`);
            case 1:
                return response(true, `Scope: "${scopes[0]}"`, objs[0]);
            default:
                return response(true, `Scope: "${scopes[0]}", ${objs.length} objects found`, objs);
        }
    } else {
        // check existence of index
        if (document[index] === undefined) {
            return response(false, `Scope "${scopes[0]}" does not have index ${index}.`);
        }
        document = document[index];
        let res = _queryDoc(keyChain, document);
        return res.success ? response(true, `Scope: "${scopes[0]}"`, res.data) : res;
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
            return response(false, `Key "${keyChain.slice(0, i + 1).join('.')}" does not exist.`);
        }
    }
    // get value by sentence key
    return response(true, null, obj);
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
function _set(scope, index, keyChain, value, insert = false, create = false, force = false) {
    if (insert) create = true;

    let data = readData();
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
            return response(false, `Scope "${scope}" does not exist.`);
        }
    }
    document = document[scope];
    // check existence of index
    if (document[index] === undefined) {
        if (create) {
            index = document.push({}) - 1;
        } else {
            return response(false, `Scope "${scope}" does not have index ${index}.`);
        }
    } else {
        if (insert) {
            // insert new document
            document.splice(index, 0, {});
        }
    }
    document = document[index];
    let res = _updateDoc(keyChain, value, document, create, force);
    return res.success ? writeData(data) : res;
}

function _updateDoc(keyChain, value, document, create, force) {
    // check key chain
    if (keyChain.length === 0) {
        return response(false, 'Key chain cannot be missing.');
    }
    let obj = document;
    let i;
    for (i = 0; i < keyChain.length - 1; i++) {
        // check existence of key
        if (obj[keyChain[i]] === undefined) {
            if (create) {
                obj[keyChain[i]] = {};
            } else {
                return response(false, `Key "${keyChain.slice(0, i + 1).join('.')}" does not exist.`);
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
                return response(false, `Not allowed to overwrite object under "${keyChain.join('.')}".`);
            }
            obj[keyChain[i]] = value;
        } else {
            return response(false, `Key "${keyChain.join('.')}" already exists.`);
        }
    } else {
        if (create) {
            obj[keyChain[i]] = value;
        } else {
            return response(false, `Key "${keyChain.join('.')}" does not exist.`);
        }
    }
    return response(true);
}

/**
 * Delete document or sentence by key chain specified. Scope would be deleted automatically if there is no document in it.
 * 
 * @param {string} scope scope name
 * @param {Integer} index index of document to be deleted from the scope
 * @param {Array.<string>} keyChain key chain of document, empty array means deleting the whole document given that `force` mode is enabled
 * @param {boolean} force force to delete even if the deleting target is an object
 */
function _delete(scope, index, keyChain, force = false) {
    let data = readData();
    if (data.success) {
        data = data.data;
    } else {
        return data;
    }
    let document = data;
    // check existence of scope and index
    if (document[scope] === undefined || document[scope][index] === undefined) {
        return response(false, `Scope "${scope}" or index ${index} does not exist.`);
    }
    document = document[scope];
    if (keyChain.length === 0) {
        // delete whole document
        if (force) {
            document.splice(index, 1);
            if (document.length === 0) {
                delete data[scope];
            }
            return writeData(data);
        } else {
            return response(false, `Not allowed to delete document with index ${index} under scope "${scope}".`);
        }
    }
    document = document[index];
    let res = _deleteDoc(keyChain, document, force);
    return res.success ? writeData(data) : res;
}

function _deleteDoc(keyChain, document, force) {
    let obj = document;
    let i;
    for (i = 0; i < keyChain.length - 1; i++) {
        // iterate into nested object
        obj = obj[keyChain[i]];
        // check existence
        if (obj === undefined) {
            return response(false, `Key "${keyChain.slice(0, i + 1).join('.')}" does not exist.`);
        }
    }
    // check existence
    if (!(keyChain[i] in obj)) {
        return response(false, `Key "${keyChain.join('.')}" does not exist.`);
    }
    // check object
    if (typeof obj[keyChain[i]] === 'object' && !force) {
        return response(false, `Not allowed to delete object under "${keyChain.join('.')}".`);
    }
    // delete sentence by sentence key
    delete obj[keyChain[i]];
    return response(true);
}

/**
 * Search scopes that contain object/sentence keys by text specified where fuzzy
 * matching is enabled.
 * 
 * @param {string} text text to be matched
 * @param {boolean} noFuzzy whether to disable fuzzy matching
 */
function _search(text, noFuzzy = false) {
    let data = readData();
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
            return response(false, `No eligible scope found by searching "${text}".`);
        case 1:
            return _get(scopes[0], "all", [], true);
        default:
            return response(true, `${scopes.length} eligible scopes found.`, scopes);
    }
}

function _searchObj(obj, text, noFuzzy) {
    // iterate over keys of object
    for (const key in obj) {
        // match object/sentence key
        if (!noFuzzy) {
            let lowerKey = key.toLowerCase();
            if (lowerKey.indexOf(text) > -1) {
                return true;
            }
        } else {
            if (key === text) {
                return true;
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
 * Move a document from one position to another. Target scope would be created if it does not exist. Source document would be deleted first and then be inserted into target index under target scope. Empty scope would be deleted automatically.
 * 
 * @param {string} scope1 source scope name
 * @param {Integer} index1 source index
 * @param {string} scope2 target scope name
 * @param {Integer} index2 target index
 */
function _move(scope1, index1, scope2, index2) {
    let data = readData();
    if (data.success) {
        data = data.data;
    } else {
        return data;
    }
    let document = data;
    // check existence of source scope and index
    if (document[scope1] === undefined || document[scope1][index1] === undefined) {
        return response(false, `Source scope "${scope1}" or index ${index1} does not exist.`);
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

    return writeData(data);
}

function _import(filePath) {
    let data;
    // read json data from file
    try {
        data = fs.readFileSync(filePath, 'utf8');
        data = JSON.parse(data);
    } catch (err) {
        return response(false, err.message);
    }
    // check json structure
    if (Object.prototype.toString.call(data) !== Object.prototype.toString.call({})) {
        return response(false, 'Non-compliant file input.');
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
        if (!Array.isArray(documents)) {
            return response(false, 'Non-compliant file input.');
        }
        for (let i = 0; i < documents.length; i++) {
            if (!consistsOfObjectsOnly(documents[i])) {
                return response(false, 'Non-compliant file input.');
            }
        }
    }
    return writeData(data);
}

function _export(filePath) {
    let data = readData();
    if (data.success) {
        data = data.data;
    } else {
        return data;
    }
    // write json data to file
    try {
        data = JSON.stringify(data, null, 2);
        fs.writeFileSync(filePath, data, 'utf8');
    } catch (err) {
        return response(false, err.message);
    }
    return response(true);
}

// initialise data storage if non-existent
const iniData = {
    "scope0": [
        {
            "name": "document1",
            "description": "This is a sample document.",
            "object2": {
                "sentenceKey": "fetch me by key chain `scope0 object2 sentenceKey`"
            }
        }
    ]
}
if (!fs.existsSync(config.fileStoragePath)) {
    fs.mkdirSync(path.dirname(config.fileStoragePath), { recursive: true });
    let res = writeData(iniData);
    if (!res.success) {
        console.error("Failed to initialise data storage: %s", res.message);
        process.exit(0);
    }
}

exports.get = _get;
exports.set = _set;
exports.delete = _delete;
exports.search = _search;
exports.move = _move;
exports.import = _import;
exports.export = _export;
