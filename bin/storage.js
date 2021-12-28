const fs = require('fs');
const config = require('./config.js');

/**
 * Get a value from filestore by key chain specified.
 * 
 * @param {String | Array.<string>} keyChain
 * @returns {String | null} value of given key chain in filestore
 */
function _get(keyChain) {
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
            // check undefined
            if (!obj) {
                console.warn('Key "' + keyChain.slice(0, i + 1).join('::') + '" does not exist.');
                return null;
            }
        }
        // get value from the last key
        return obj[keyChain[i]];
    } catch (err) {
        console.error(err.message);
        return null;
    }
}

/**
 * Create/Modify a key-value pair to filestore by key chain specified.
 * 
 * @param {String | Array.<string>} keyChain
 * @param {String} value
 * @param {Boolean} createObject create new object if any non-final key does not exist
 * @param {Boolean} OverwriteObject force to overwrite even if key chain points to an existing object
 * @returns {Boolean} true if success, false otherwise
 */
function _set(keyChain, value, createObject = false, OverwriteObject = false) {
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
                    console.warn('Key "' + keyChain.slice(0, i + 1).join('::') + '" does not exist.');
                    return false;
                }
            }
            // iterate into next key
            obj = obj[keyChain[i]];
        }
        // update value to the last key
        if (typeof obj[keyChain[i]] === 'object' && !OverwriteObject) {
            console.warn('Key "' + keyChain.join('::') + '" is not a plain value. Use `OverwriteObject` to overwrite.');
            return false;
        }
        obj[keyChain[i]] = value;
        fs.writeFileSync(config.fileStore, JSON.stringify(data, null, 4));
        return true;
    } catch (err) {
        console.error(err.message);
        return false;
    }
}

/**
 * Delete a key-value pair from filestore by key chain specified.
 * 
 * @param {String | Array.<string>} keyChain
 * @param {Boolean} force force to delete even if key chain points to an object
 * @returns true if success, false otherwise
 */
function _delete(keyChain, force = false) {
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
                console.warn('Key "' + keyChain.slice(0, i + 1).join('::') + '" does not exist.');
                return false;
            }
        }
        // delete value from the last key
        if (typeof obj[keyChain[i]] === 'object' && !force) {
            console.warn('Key "' + keyChain.join('::') + '" is not a plain value. Use `force` to delete.');
            return false;
        }
        if (keyChain[i] in obj) {
            delete obj[keyChain[i]];
        } else {
            console.warn('Key "' + keyChain.join('::') + '" does not exist.');
            return false;
        }
        fs.writeFileSync(config.fileStore, JSON.stringify(data, null, 4));
        return true;
    } catch (err) {
        console.error(err.message);
        return false;
    }
}

exports.get = _get;
exports.set = _set;
exports.delete = _delete;
