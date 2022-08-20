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

function _flushKeyCache(path, salt) {
    const readlineOptions = { hideEchoBack: true, mask: '', keepWhitespace: true, caseSensitive: true };
    let passphrase = readlineSync.question('Passphrase (not displayed): ', readlineOptions);
    let key = crypto.scryptSync(passphrase, salt, ALGORITHM_KEY_SIZE);
    fs.writeFileSync(path, key);
}

function _getKey(salt) {
    const keyCachePath = path.join(os.tmpdir(), 'pmanager', 'KEYCACHE');

    if (!fs.existsSync(keyCachePath)) {
        // check if key cache exists
        fs.mkdirSync(path.dirname(keyCachePath), { recursive: true });
        _flushKeyCache(keyCachePath, salt);
    } else {
        // check if key cache expires
        let cacheStat = fs.statSync(keyCachePath);
        let expireTime = Number(config.doNotAskPassphraseInSec) || 0;
        if (Date.now() - cacheStat.mtime.getTime() > 1000 * expireTime) {
            _flushKeyCache(keyCachePath, salt);
        }
    }
    // read key from key cache
    return fs.readFileSync(keyCachePath);
}

function _encrypt(dataStr) {
    let nonce = crypto.randomBytes(ALGORITHM_NONCE_SIZE);
    let key = _getKey(nonce);
    let cipher = crypto.createCipheriv(ALGORITHM_NAME, key, nonce, { authTagLength: ALGORITHM_TAG_SIZE });
    let cipherText = Buffer.concat([cipher.update(dataStr, 'utf8'), cipher.final()]);

    return Buffer.concat([nonce, cipherText, cipher.getAuthTag()]);
}

function _decrypt(dataBuf) {
    let nonce = dataBuf.slice(0, ALGORITHM_NONCE_SIZE);
    let key = _getKey(nonce);
    let decipher = crypto.createDecipheriv(ALGORITHM_NAME, key, nonce, { authTagLength: ALGORITHM_TAG_SIZE });
    let cipherText = dataBuf.slice(ALGORITHM_NONCE_SIZE, dataBuf.length - ALGORITHM_TAG_SIZE);

    let authTag = dataBuf.slice(cipherText.length + ALGORITHM_NONCE_SIZE);
    decipher.setAuthTag(authTag);

    return decipher.update(cipherText, null, 'utf8') + decipher.final('utf8');
}

exports.encrypt = _encrypt;
exports.decrypt = _decrypt;
