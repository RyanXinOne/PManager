import readlineSync from 'readline-sync';


const helpMessage = `PManager helps manage your secret information securely. Your private data is encrypted and stored in a secure manner. To access the data, set up and remember your own passphrase.

Usage:
    pm [--no-fuzzy] [--no-parse-flag] <scope> [-n <index>] [<key chain>...]
    pm -s <text>...
    pm -e[f]|-m[f]|-i|-c|-d[f] [--no-parse-flag] <scope> [-n <index>] [<key chain>...] [<value>]
    pm --move [--no-parse-flag] <source scope> [<source index>] <target scope> [<target index>]
    pm --import [<file path>|<url>]
    pm --export [<file path>]
    pm --hashcode
    pm --reset-passphrase
    pm --config [<config key>] [<config value>]
    pm --help|--version

Options:
    -n <index>                 The index number of the document under the <scope>. If the index is out of range in create mode, a new document will be created. The default value is "all" in query model which fetches all documents, and "0" in other modes.
    --index=<index>            Same as "-n <index>".
    -s, --search               Search mode. Search for scope(s) containing object/sentence key-values by specified texts. All positional arguments are treated as a single string separated by a white space. Fuzzy matching is supported.
    -e, -m, --edit             Edit mode. Modify an existing sentence in a document by specifying <key chain> and <value>.
    -i, --insert               Insert mode. Insert a new document into the specified <index> instead of editing an existing one. If specified, the flag "--create" would be treated as true anyway.
    -c, --create               Create mode. Create a new object and sentence if any key in <key chain> does not exist.
    -d, --delete               Delete mode. Delete a sentence by the specified <key chain>. An empty document and scope would be cleaned automatically.
    -f, --force                Under edit mode, force to overwrite even if any key in <key chain> points to an existing object. Under delete mode, force to delete even if the deleting target is a document or non-empty object.
    -U, --no-fuzzy             Disable fuzzy matching under query or search mode.
    --no-parse-flag            If specified, any flag occurring after the first non-flag input would not be parsed.
    --move                     If <source index> and <target index> are given, move a document from one index position to another. <target scope> would be created if it does not exist. The source document would be deleted first and then inserted into <target index> under <target scope>. An empty scope would be cleaned automatically. If <source index> and <target index> are not given, <source scope> is renamed into <target scope>.
    --import                   Import data from local file or web source. If <file path> or <url> is omitted, read from standard input.
    --export                   Export data to a file. If <file path> is omitted, write to standard output.
    --hashcode                 Print hash code of data.
    --reset-passphrase         Reset encryption passphrase.
    --config                   List current configurations, set a user config entry by <config key> and <config value>, or reset a config entry by leaving <config value> empty.
    -h, --help                 Print this help message.
    -v, --version              Print version number.

The "pm" command works under different modes based on the provided flags. If no flag is specified, "pm" is under query mode by default. It fetches the object or sentence value by the specified <key chain> in the first document under the provided <scope>. The <scope> query supports fuzzy matching by default. One <scope> can have multiple documents that are distinguished by the <index> value. A <document> contains nested objects and sentences, which are key-value pairs with <value> being a string that can be queried by <key chain>. The <key chain> is a list of keys separated by white space.`;


/**
 * Print object/string to stdout.
 */
function print(obj) {
    if (typeof obj === 'object') {
        console.log(JSON.stringify(obj, null, 2));
    } else {
        console.log(obj);
    }
}

/**
 * Read multiple lines from stdin.
 */
function readLines() {
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
function sleep(sec) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, sec * 1000);
}

/**
 * Ask secret from command line input. Hide user input.
 */
function askSecret(query) {
    const readlineOptions = { hideEchoBack: true, mask: '', keepWhitespace: true, caseSensitive: true };
    let secret = readlineSync.question(query + '[cancel? c] ', readlineOptions);
    if (secret === 'c') {
        process.exit(1);
    }
    return secret;
}

export { helpMessage, print, readLines, sleep, askSecret };
