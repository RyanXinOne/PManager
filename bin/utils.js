const readlineSync = require('readline-sync');


/**
 * Print object/string to stdout.
 */
function _print(obj) {
    if (typeof obj === 'object') {
        console.log(JSON.stringify(obj, null, 2));
    } else {
        console.log(obj);
    }
}

/**
 * Read multiple lines from stdin.
 */
function _readLines() {
    let lines = "";
    readlineSync.promptLoop(line => {
        if (line) {
            lines += line + '\n';
            return false;
        } else {
            return true;
        }
    }, { prompt: '' });
    return lines;
}

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
    let secret = readlineSync.question(query + '[cancel? c] ', readlineOptions);
    if (secret === 'c') {
        process.exit(1);
    }
    return secret;
}

exports.print = _print;
exports.readLines = _readLines;
exports.sleep = _sleep;
exports.askSecret = _askSecret;
