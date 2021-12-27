const fs = require('fs');
const config = require('./config.js');

/**
 * Get a value from filestore by key chain specified.
 * 
 * @param {Array.<string>} keyChain
 * @returns {*} value of given key chain in filestore
 */
function get(keyChain) {
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
 * Set a value to filestore by key chain specified.
 * Create new object if any key does not exist.
 * 
 * @param {Array.<string>} keyChain
 * @param {String} value
 * @returns {Boolean} true if succeed, false otherwise
 */
function set(keyChain, value) {
    if (!Array.isArray(keyChain)) {
        keyChain = [keyChain];
    }
    try {
        let data = fs.readFileSync(config.fileStore, 'utf8');
        data = JSON.parse(data);
        let obj = data;
        let i;
        for (i = 0; i < keyChain.length - 1; i++) {
            // create a new object if not exist
            if (!obj[keyChain[i]]) {
                obj[keyChain[i]] = {};
            }
            // iterate into next key
            obj = obj[keyChain[i]];
        }
        // update value to the last key
        obj[keyChain[i]] = value;
        fs.writeFileSync(config.fileStore, JSON.stringify(data, null, 4));
        return true;
    } catch (err) {
        console.error(err.message);
        return false;
    }
}

exports.get = get;
exports.set = set;
