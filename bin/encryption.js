const config = require('./config.js');
const crypto = require('crypto');

const ALGORITHM_NAME = 'aes-256-gcm';
const ALGORITHM_KEY_SIZE = 32;
const ALGORITHM_NONCE_SIZE = 16;
const ALGORITHM_TAG_SIZE = 16;

function _encrypt(dataStr) {
    let nonce = crypto.randomBytes(ALGORITHM_NONCE_SIZE);
    let key = crypto.scryptSync(config.passphrase, nonce, ALGORITHM_KEY_SIZE);
    let cipher = crypto.createCipheriv(ALGORITHM_NAME, key, nonce, { authTagLength: ALGORITHM_TAG_SIZE });
    let cipherText = Buffer.concat([cipher.update(dataStr, 'utf8'), cipher.final()]);

    return Buffer.concat([nonce, cipherText, cipher.getAuthTag()]);
}

function _decrypt(dataBuf) {
    let nonce = dataBuf.slice(0, ALGORITHM_NONCE_SIZE);
    let key = crypto.scryptSync(config.passphrase, nonce, ALGORITHM_KEY_SIZE);
    let decipher = crypto.createDecipheriv(ALGORITHM_NAME, key, nonce, { authTagLength: ALGORITHM_TAG_SIZE });
    let cipherText = dataBuf.slice(ALGORITHM_NONCE_SIZE, dataBuf.length - ALGORITHM_TAG_SIZE);

    let authTag = dataBuf.slice(cipherText.length + ALGORITHM_NONCE_SIZE);
    decipher.setAuthTag(authTag);

    return decipher.update(cipherText, null, 'utf8') + decipher.final('utf8');
}

exports.encrypt = _encrypt;
exports.decrypt = _decrypt;
