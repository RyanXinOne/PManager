const config = require('./config.js');
const fs = require('fs');


function response(success, message = null, data = null) {
    return {
        success: success,
        message: message,
        data: data
    };
}

function readData() {
    let data;
    try {
        data = fs.readFileSync(config.fileStore, 'utf8');
        data = JSON.parse(data);
    } catch (err) {
        return response(false, err.message);
    }
    return response(true, null, data);
}

function writeData(data) {
    try {
        fs.writeFileSync(config.fileStore, JSON.stringify(data, null, 4));
    } catch (err) {
        return response(false, err.message);
    }
    return response(true);
}

/**
 * Fetch from document by key chain specified.
 * 
 * @param {string} scope scope name
 * @param {Integer} index index of document to be fetched under the scope
 * @param {Array.<string>} keyChain key chain of document
 */
function _get(scope, index, keyChain) {
    let data = readData();
    if (data.success) {
        data = data.data;
    } else {
        return data;
    }
    let document = data;
    // check existence of scope and index
    if (!document[scope] || !document[scope][index]) {
        return response(false, `Scope "${scope}" or index ${index} does not exist.`);
    }
    document = document[scope][index];
    return _getDoc(keyChain, document);
}

function _getDoc(keyChain, document) {
    let obj = document;
    for (let i = 0; i < keyChain.length; i++) {
        // iterate into next key
        obj = obj[keyChain[i]];
        // check undefined
        if (!obj) {
            return response(false, `Key "${keyChain.slice(0, i + 1).join('.')}" does not exist.`);
        }
    }
    // get value from the final key
    return response(true, null, obj);
}

/**
 * Create scope/document or insert/update key-value pair in document by key chain specified.
 * 
 * @param {string} scope scope name
 * @param {Integer} index index of document to be updated under the scope, a new document would be created if out of range
 * @param {Array.<string>} keyChain key chain of document
 * @param {string} value value to be set
 * @param {boolean} create create new object if any non-final key in key chain does not exist
 * @param {boolean} force force to overwrite if any key in key chain points to an existing object
 */
function _set(scope, index, keyChain, value, create = false, force = false) {
    let data = readData();
    if (data.success) {
        data = data.data;
    } else {
        return data;
    }
    let document = data;
    // check existence of scope
    if (!document[scope]) {
        if (create) {
            document[scope] = [];
        } else {
            return response(false, `Scope "${scope}" does not exist.`);
        }
    }
    document = document[scope];
    // check existence of index
    if (!document[index]) {
        if (create) {
            index = document.push({}) - 1;
        } else {
            return response(false, `Index ${index} under scope "${scope}" does not exist.`);
        }
    }
    document = document[index];
    let res = _setDoc(keyChain, value, document, create, force);
    return res.success ? writeData(data) : res;
}

function _setDoc(keyChain, value, document, create, force) {
    // check key chain
    if (keyChain.length === 0) {
        return response(false, 'Key chain cannot be empty.');
    }
    let obj = document;
    let i;
    for (i = 0; i < keyChain.length - 1; i++) {
        // check existence of key
        if (!obj[keyChain[i]]) {
            if (create) {
                obj[keyChain[i]] = {};
            } else {
                return response(false, `Key "${keyChain.slice(0, i + 1).join('.')}" does not exist.`);
            }
        }
        // iterate into next key
        obj = obj[keyChain[i]];
    }
    // check object
    if (typeof obj[keyChain[i]] === 'object' && !force) {
        return response(false, `Not allowed to overwrite object on "${keyChain.join('.')}".`);
    }
    // update value to the final key
    obj[keyChain[i]] = value;
    return response(true);
}

/**
 * Delete document or key-value pair in document by key chain specified. Scope would be automatically deleted if there is no document in it.
 * 
 * @param {string} scope scope name
 * @param {Integer} index index of document to be deleted from the scope
 * @param {Array.<string>} keyChain key chain of document, empty array means deleting the whole document given that `force` mode is enabled
 * @param {boolean} force force to delete if deleting target is an object
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
    if (!document[scope] || !document[scope][index]) {
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
            return response(false, `Not allowed to delete document object with index ${index} under scope "${scope}".`);
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
        // iterate into next key
        obj = obj[keyChain[i]];
        // check existence
        if (!obj) {
            return response(false, `Key "${keyChain.slice(0, i + 1).join('.')}" does not exist.`);
        }
    }
    // check existence
    if (!(keyChain[i] in obj)) {
        return response(false, `Key "${keyChain.join('.')}" does not exist.`);
    }
    // check object
    if (typeof obj[keyChain[i]] === 'object' && !force) {
        return response(false, `Not allowed to delete object on "${keyChain.join('.')}".`);
    }
    // delete value from the final key
    delete obj[keyChain[i]];
    return response(true);
}

exports.get = _get;
exports.set = _set;
exports.delete = _delete;
