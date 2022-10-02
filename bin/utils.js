const readlineSync = require('readline-sync');


/**
 * Sleep in seconds.
 */
function _sleep(sec) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, sec * 1000);
}

/**
 * Ask secret from command line input. Hide user input.
 */
function _askSecret(query) {
    const readlineOptions = { hideEchoBack: true, mask: '', keepWhitespace: true, caseSensitive: true };
    let secret = readlineSync.question('[cancel? c] ' + query, readlineOptions);
    if (secret === 'c') {
        process.exit(1);
    }
    return secret;
}

exports.sleep = _sleep;
exports.askSecret = _askSecret;
