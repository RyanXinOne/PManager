const config = require('./config.js');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const readlineSync = require('readline-sync');


const ALGORITHM_NAME = 'aes-256-gcm';
const ALGORITHM_KEY_SIZE = 32;
const ALGORITHM_NONCE_SIZE = 16;
const ALGORITHM_TAG_SIZE = 16;

let ACTIVE_KEY = undefined;

/**
 * Flush key cache by asking user passphrase from command line input. The key is
 * generated from passphrase and saved into local cache file.
 * 
 * @param {string} path key cache file path
 */
function _flushKeyCache(path) {
    const readlineOptions = { hideEchoBack: true, mask: '', keepWhitespace: true, caseSensitive: true };
    let passphrase = readlineSync.question('Passphrase (not displayed): ', readlineOptions);
    let salt = crypto.createHash('sha256').update(passphrase).digest();
    let key = crypto.scryptSync(passphrase, salt, ALGORITHM_KEY_SIZE);
    fs.writeFileSync(path, key);
}

/**
 * Get the key that is used for encryption.
 * This method uses existing active key to avoid fetch from cache multiple times in one process.
 * If no active key, then try to fetch from cache.
 * If failed to fetch from cache, then flush key cache.
 * 
 * @returns {Buffer} encryption key
 */
function _getKey() {
    if (ACTIVE_KEY === undefined) {
        const keyCachePath = path.join(os.tmpdir(), 'pmanager', 'KEYCACHE');
        // check if key cache exists
        if (!fs.existsSync(keyCachePath)) {
            fs.mkdirSync(path.dirname(keyCachePath), { recursive: true });
            _flushKeyCache(keyCachePath);
        } else {
            // check if key cache expires
            let cacheStat = fs.statSync(keyCachePath);
            let expireTime = Number(config.doNotAskPassphraseInSec) || 0;
            if (Date.now() - cacheStat.mtime.getTime() > 1000 * expireTime) {
                _flushKeyCache(keyCachePath);
            }
        }
        // read key from key cache
        ACTIVE_KEY = fs.readFileSync(keyCachePath)
    }
    return ACTIVE_KEY;
}

/**
 * Encrypt a text string.
 * 
 * @param {string} dataStr text string to encrypt
 * @returns {Buffer} encrypted binary buffer
 */
function _encrypt(dataStr) {
    let nonce = crypto.randomBytes(ALGORITHM_NONCE_SIZE);
    let cipher = crypto.createCipheriv(ALGORITHM_NAME, _getKey(), nonce, { authTagLength: ALGORITHM_TAG_SIZE });
    let cipherText = Buffer.concat([cipher.update(dataStr, 'utf8'), cipher.final()]);

    return Buffer.concat([nonce, cipherText, cipher.getAuthTag()]);
}

/**
 * Decrypt a binary buffer.
 * 
 * @param {Buffer} dataBuf binary buffer to decrypt
 * @returns {string} decrypted text string
 */
function _decrypt(dataBuf) {
    let nonce = dataBuf.subarray(0, ALGORITHM_NONCE_SIZE);
    let decipher = crypto.createDecipheriv(ALGORITHM_NAME, _getKey(), nonce, { authTagLength: ALGORITHM_TAG_SIZE });
    let cipherText = dataBuf.subarray(ALGORITHM_NONCE_SIZE, dataBuf.length - ALGORITHM_TAG_SIZE);

    let authTag = dataBuf.subarray(cipherText.length + ALGORITHM_NONCE_SIZE);
    decipher.setAuthTag(authTag);

    return decipher.update(cipherText, null, 'utf8') + decipher.final('utf8');
}

exports.encrypt = _encrypt;
exports.decrypt = _decrypt;
