import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { sleep, askSecret } from './utils.js';
import { config } from './config.js';


const ALGORITHM_NAME = 'aes-256-gcm';
const ALGORITHM_KEY_SIZE = 32;
const ALGORITHM_NONCE_SIZE = 16;
const ALGORITHM_TAG_SIZE = 16;
const PASSPHRASE_TRIAL_LIMIT = 5;

const KEY_CACHE_PATH = path.join(os.tmpdir(), 'pmanager', 'KEYCACHE');
fs.mkdirSync(path.dirname(KEY_CACHE_PATH), { recursive: true });

let ACTIVE_KEY = undefined;

/**
 * Update ACTIVE_KEY from key cache file.
 */
function _updateActiveKey() {
    try {
        ACTIVE_KEY = fs.readFileSync(KEY_CACHE_PATH);
    } catch (err) {
        console.error("Failed to read key cache file: %s", err.message);
        process.exit(0);
    }
}

/**
 * Flush local key cache by input passphrase. If not provided, ask user passphrase
 * from command line input. The key is generated from passphrase and saved into
 * local temporary cache file.
 * 
 * @param {string} passphrase passphrase to generate key from. If null, ask from command line input.
 */
function _flushKeyCache(passphrase) {
    if (passphrase === null) {
        passphrase = askSecret('Passphrase (not displayed): ');
    }
    let salt = crypto.createHash('sha256').update(passphrase).digest();
    let key = crypto.scryptSync(passphrase, salt, ALGORITHM_KEY_SIZE);
    try {
        fs.writeFileSync(KEY_CACHE_PATH, key);
    } catch (err) {
        console.error("Failed to write to key cache file: %s", res.message);
        process.exit(0);
    }
}

/**
 * Set up ACTIVE_KEY that is used for encryption.
 * If already set up, use existing active key to avoid fetching multiple times from cache.
 * If no active key, then fetch key from cache.
 * If cache cannot be trusted, then flush key cache. (whenever flush, try empty passphrase before having to ask user)
 * 
 * @param {boolean} forceFlush force to flush key cache
 */
function _prepareActiveKey(forceFlush = false) {
    // check if ACTIVE_KEY is already set up
    if (ACTIVE_KEY !== undefined) {
        return;
    }
    // prepare key cache
    if (forceFlush) {
        _flushKeyCache(null);
    } else if (!fs.existsSync(KEY_CACHE_PATH)) {
        // check key cache existence
        _flushKeyCache('');
    } else {
        // check if key cache expires
        let cacheStat = fs.statSync(KEY_CACHE_PATH);
        let expireTime = Number(config.doNotAskPassphraseInSec) || 0;
        if (Date.now() - cacheStat.mtime.getTime() > 1000 * expireTime) {
            _flushKeyCache('');
        }
    }
    // now key cache is ready and trusted, read ACTIVE_KEY from cache
    _updateActiveKey();
}

/**
 * Encrypt a text string.
 * 
 * @param {string} dataStr text string to encrypt
 * @returns {Buffer} encrypted binary buffer
 */
function encrypt(dataStr) {
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
function decrypt(dataBuf, trial = 0) {
    if (trial > PASSPHRASE_TRIAL_LIMIT) {
        throw new Error('Maximum passphrase trial reached.');
    }

    _prepareActiveKey(trial > 0);
    let nonce = dataBuf.subarray(0, ALGORITHM_NONCE_SIZE);
    let cipherText = dataBuf.subarray(ALGORITHM_NONCE_SIZE, dataBuf.length - ALGORITHM_TAG_SIZE);
    let authTag = dataBuf.subarray(cipherText.length + ALGORITHM_NONCE_SIZE);

    try {
        let decipher = crypto.createDecipheriv(ALGORITHM_NAME, ACTIVE_KEY, nonce, { authTagLength: ALGORITHM_TAG_SIZE }).setAuthTag(authTag);
        return decipher.update(cipherText, null, 'utf8') + decipher.final('utf8');
    } catch (err) {
        // fail to decrypt, reset active key
        ACTIVE_KEY = undefined;
        sleep(trial * 0.5);
        return decrypt(dataBuf, trial + 1);
    }
}

/**
 * Manually set ACTIVE_KEY. Use given passphrase to flush local key cache and read
 * key from it.
 * 
 * @param {string} passphrase passphrase to generate key from
 */
function setKey(passphrase) {
    _flushKeyCache(passphrase);
    _updateActiveKey();
}

/**
 * Reset key cache and ACTIVE_KEY.
 */
function lockKey() {
    _flushKeyCache('');
    _updateActiveKey();
}

export { encrypt, decrypt, setKey, lockKey };
