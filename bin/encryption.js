const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const config = require('./config.js');
const { sleep, askSecret } = require('./utils.js');


const ALGORITHM_NAME = 'aes-256-gcm';
const ALGORITHM_KEY_SIZE = 32;
const ALGORITHM_NONCE_SIZE = 16;
const ALGORITHM_TAG_SIZE = 16;
const PASSPHRASE_TRIAL_LIMIT = 5;

const KEY_CACHE_PATH = path.join(os.tmpdir(), 'pmanager', 'KEYCACHE');
fs.mkdirSync(path.dirname(KEY_CACHE_PATH), { recursive: true });

let ACTIVE_KEY;
_setActiveKey('');  // try empty passphrase by default

/**
 * Flush local key cache by input passphrase. If not provided, ask user passphrase
 * from command line input. The key is generated from passphrase and saved into
 * local temporary cache file.
 * 
 * @param {string} passphrase passphrase to generate key from
 */
function _flushKeyCache(passphrase = undefined) {
    if (passphrase === undefined) {
        passphrase = askSecret('Passphrase (not displayed): ');
    }
    let salt = crypto.createHash('sha256').update(passphrase).digest();
    let key = crypto.scryptSync(passphrase, salt, ALGORITHM_KEY_SIZE);
    fs.writeFileSync(KEY_CACHE_PATH, key);
}

/**
 * Set up ACTIVE_KEY that is used for encryption.
 * If already set up, use existing active key to avoid fetching multiple times from cache.
 * If no active key, then fetch key from cache.
 * If cache is not ready, then flush key cache.
 */
function _prepareActiveKey() {
    // check if active key is already set up
    if (ACTIVE_KEY !== undefined) {
        return;
    }
    // check if key cache exists
    if (!fs.existsSync(KEY_CACHE_PATH)) {
        _flushKeyCache();
    } else {
        // check if key cache expires
        let cacheStat = fs.statSync(KEY_CACHE_PATH);
        let expireTime = Number(config.doNotAskPassphraseInSec) || 0;
        if (Date.now() - cacheStat.mtime.getTime() > 1000 * expireTime) {
            _flushKeyCache();
        }
    }
    ACTIVE_KEY = fs.readFileSync(KEY_CACHE_PATH);
}

/**
 * Manually set ACTIVE_KEY. Use given passphrase to flush local key cache and read
 * key from it.
 * 
 * @param {string} passphrase passphrase to generate key from
 */
function _setActiveKey(passphrase) {
    _flushKeyCache(passphrase);
    ACTIVE_KEY = fs.readFileSync(KEY_CACHE_PATH);
}

/**
 * Encrypt a text string.
 * 
 * @param {string} dataStr text string to encrypt
 * @returns {Buffer} encrypted binary buffer
 */
function _encrypt(dataStr) {
    _prepareActiveKey();
    let nonce = crypto.randomBytes(ALGORITHM_NONCE_SIZE);
    let cipher = crypto.createCipheriv(ALGORITHM_NAME, ACTIVE_KEY, nonce, { authTagLength: ALGORITHM_TAG_SIZE });
    let cipherText = Buffer.concat([cipher.update(dataStr, 'utf8'), cipher.final()]);

    return Buffer.concat([nonce, cipherText, cipher.getAuthTag()]);
}

/**
 * Decrypt a binary buffer.
 * 
 * @param {Buffer} dataBuf binary buffer to decrypt
 * @returns {string} decrypted text string
 */
function _decrypt(dataBuf, trial = 0) {
    if (trial > PASSPHRASE_TRIAL_LIMIT) {
        throw new Error('Maximum passphrase trial reached.');
    }
    _prepareActiveKey();
    let nonce = dataBuf.subarray(0, ALGORITHM_NONCE_SIZE);
    let cipherText = dataBuf.subarray(ALGORITHM_NONCE_SIZE, dataBuf.length - ALGORITHM_TAG_SIZE);
    let authTag = dataBuf.subarray(cipherText.length + ALGORITHM_NONCE_SIZE);

    try {
        let decipher = crypto.createDecipheriv(ALGORITHM_NAME, ACTIVE_KEY, nonce, { authTagLength: ALGORITHM_TAG_SIZE }).setAuthTag(authTag);
        return decipher.update(cipherText, null, 'utf8') + decipher.final('utf8');
    } catch (err) {
        // fail to decrypt, reset active key
        ACTIVE_KEY = undefined;
        sleep(trial * 2);
        return _decrypt(dataBuf, trial + 1);
    }
}

exports.setKey = _setActiveKey;
exports.encrypt = _encrypt;
exports.decrypt = _decrypt;
