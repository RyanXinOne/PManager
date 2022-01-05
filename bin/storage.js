const config = require('./config.js');
const fs = require('fs');


function response(success, message = null, data = null) {
    return {
        success: success,
        message: message,
        data: data
    };
}

/**
 * Get a value from filestore by key chain specified.
 * Return string of given key chain in filestore.
 * 
 * @param {String | Array.<string>} keyChain
 */
function _get(keyChain) {
    if (keyChain.length === 0) {
        return response(false, 'Key chain is empty.');
    }
    if (!Array.isArray(keyChain)) {
        keyChain = [keyChain];
    }
    try {
        let data = fs.readFileSync(config.fileStore, 'utf8');
        data = JSON.parse(data);
        let obj = data;
        let i;
        for (i = 0; i < keyChain.length; i++) {
            // iterate into next key
            obj = obj[keyChain[i]];
            // check undefined
            if (!obj) {
                return response(false, 'Key "' + keyChain.slice(0, i + 1).join('::') + '" does not exist.');
            }
        }
        // get value from the last key
        return response(true, null, obj);
    } catch (err) {
        return response(false, err.message);
    }
}

/**
 * Create/Modify a key-value pair to filestore by key chain specified.
 * 
 * @param {String | Array.<string>} keyChain
 * @param {String} value
 * @param {Boolean} createObject create new object if any non-final key does not exist
 * @param {Boolean} force force to overwrite even if key chain points to an existing object
 */
function _set(keyChain, value, createObject = false, force = false) {
    if (keyChain.length === 0) {
        return response(false, 'Key chain is empty.');
    }
    if (!Array.isArray(keyChain)) {
        keyChain = [keyChain];
    }
    try {
        let data = fs.readFileSync(config.fileStore, 'utf8');
        data = JSON.parse(data);
        let obj = data;
        let i;
        for (i = 0; i < keyChain.length - 1; i++) {
            // check existence
            if (!obj[keyChain[i]]) {
                if (createObject) {
                    obj[keyChain[i]] = {};
                } else {
                    return response(false, 'Key "' + keyChain.slice(0, i + 1).join('::') + '" does not exist.');
                }
            }
            // iterate into next key
            obj = obj[keyChain[i]];
        }
        // check object
        if (typeof obj[keyChain[i]] === 'object' && !force) {
            return response(false, 'Key "' + keyChain.join('::') + '" is not a plain value. Use `force` to overwrite.');
        }
        // update value to the final key
        obj[keyChain[i]] = value;
        fs.writeFileSync(config.fileStore, JSON.stringify(data, null, 4));
        return response(true);
    } catch (err) {
        return response(false, err.message);
    }
}

/**
 * Delete a key-value pair from filestore by key chain specified.
 * 
 * @param {String | Array.<string>} keyChain
 * @param {Boolean} force force to delete even if key chain points to an object
 */
function _delete(keyChain, force = false) {
    if (keyChain.length === 0) {
        return response(false, 'Key chain is empty.');
    }
    if (!Array.isArray(keyChain)) {
        keyChain = [keyChain];
    }
    try {
        let data = fs.readFileSync(config.fileStore, 'utf8');
        data = JSON.parse(data);
        let obj = data;
        let i;
        for (i = 0; i < keyChain.length - 1; i++) {
            // iterate into next key
            obj = obj[keyChain[i]];
            // check existence
            if (!obj) {
                return response(false, 'Key "' + keyChain.slice(0, i + 1).join('::') + '" does not exist.');
            }
        }
        // check existence
        if (!(keyChain[i] in obj)) {
            return response(false, 'Key "' + keyChain.join('::') + '" does not exist.');
        }
        // check object
        if (typeof obj[keyChain[i]] === 'object' && !force) {
            return response(false, 'Key "' + keyChain.join('::') + '" is not a plain value. Use `force` to delete.');
        }
        // delete value from the last key
        delete obj[keyChain[i]];
        fs.writeFileSync(config.fileStore, JSON.stringify(data, null, 4));
        return response(true);
    } catch (err) {
        return response(false, err.message);
    }
}

exports.get = _get;
exports.set = _set;
exports.delete = _delete;
