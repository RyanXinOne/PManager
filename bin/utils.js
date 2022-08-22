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
    return readlineSync.question(query, readlineOptions);
}

exports.sleep = _sleep;
exports.askSecret = _askSecret;
