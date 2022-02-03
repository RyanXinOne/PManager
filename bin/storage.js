const config = require('./config.js');
const fs = require('fs');


function response(success, message = null, data = null) {
    return {
        success: success,
        message: message,
        data: data
    };
}

function readData(filePath = undefined) {
    if (filePath === undefined) {
        filePath = config.fileStoragePath;
    }
    let data;
    try {
        data = fs.readFileSync(filePath, 'utf8');
        data = JSON.parse(data);
    } catch (err) {
        return response(false, err.message);
    }
    return response(true, null, data);
}

function writeData(data, filePath = undefined) {
    if (filePath === undefined) {
        filePath = config.fileStoragePath;
    }
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
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
 * Modify existing key-value pair in document by key chain and value specified.
 * 
 * @param {string} scope scope name
 * @param {Integer} index index of document to be updated under the scope, a new document would be created if out of range
 * @param {Array.<string>} keyChain key chain of document
 * @param {string} value value to be set
 * @param {boolean} insert insert new document into index instead of editing existing one. If true, flag `create` would be treated as true anyway
 * @param {boolean} create create new object and key-value pair if any of them in key chain does not exist
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
    } else {
        if (insert) {
            // insert new document
            document.splice(index, 0, {});
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
    // check existence of final key-value pair and update
    if (obj.hasOwnProperty(keyChain[i])) {
        if (!create) {
            // check if final key points to an object
            if (typeof obj[keyChain[i]] === 'object' && !force) {
                return response(false, `Not allowed to overwrite object on "${keyChain.join('.')}".`);
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
 * Delete document or key-value pair in document by key chain specified. Scope would be deleted automatically if there is no document in it.
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
    if (!document[scope1] || !document[scope1][index1]) {
        return response(false, `Source scope "${scope1}" or index ${index1} does not exist.`);
    }
    document = document[scope1][index1];
    // delete source document
    data[scope1].splice(index1, 1);
    // insert into target position
    if (!data[scope2]) {
        data[scope2] = [];
    }
    if (!data[scope2][index2]) {
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
    let data = readData(filePath);
    if (data.success) {
        data = data.data;
    } else {
        return data;
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
            for (let key in obj) {
                if (typeof obj[key] !== 'string') {
                    queue.push(obj[key]);
                }
            }
        }
        return true;
    };
    for (let scope in data) {
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
    return writeData(data, filePath);
}

exports.get = _get;
exports.set = _set;
exports.delete = _delete;
exports.move = _move;
exports.import = _import;
exports.export = _export;
