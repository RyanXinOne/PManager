const config = require('./config.js');
const crypto = require('crypto');

const ivPhrase = 'AVERYSTRONGIV';

const resizedIV = Buffer.allocUnsafe(16);
const iv = crypto.createHash('sha256').update(ivPhrase).digest();
iv.copy(resizedIV);

function _encrypt(dataStr) {
    const key = crypto.createHash('sha256').update(config.passphrase).digest();
    let cipher = crypto.createCipheriv('aes-256-cbc', key, resizedIV);
    return Buffer.concat([cipher.update(dataStr, 'utf8'), cipher.final()]);
}

function _decrypt(dataBuf) {
    const key = crypto.createHash('sha256').update(config.passphrase).digest();
    let decipher = crypto.createDecipheriv('aes-256-cbc', key, resizedIV);
    return decipher.update(dataBuf, null, 'utf8') + decipher.final('utf8');
}

exports.encrypt = _encrypt;
exports.decrypt = _decrypt;
