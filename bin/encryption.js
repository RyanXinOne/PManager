const config = require('./config.js');
const crypto = require('crypto');

const ivPhrase = 'AVERYSTRONGIV';

const resizedIV = Buffer.allocUnsafe(16);
const iv = crypto.createHash('sha256').update(ivPhrase).digest();
iv.copy(resizedIV);

function _encrypt(data) {
    const key = crypto.createHash('sha256').update(config.passphrase).digest();
    let cipher = crypto.createCipheriv('aes256', key, resizedIV);
    return cipher.update(data, 'utf8', 'hex') + cipher.final('hex');
}

function _decrypt(data) {
    const key = crypto.createHash('sha256').update(config.passphrase).digest();
    let decipher = crypto.createDecipheriv('aes256', key, resizedIV);
    return decipher.update(data, 'hex', 'utf8') + decipher.final('utf8');
}

exports.encrypt = _encrypt;
exports.decrypt = _decrypt;
