# PManager
```
Your one-stop privacy manager.

Usage:
    pm [--no-fuzzy] [--no-parse-flag] <scope> [-n <index>] [<key chain>...]
    pm -s <text>...
    pm -e[f]|-m[f]|-i|-c|-d[f] [--no-parse-flag] <scope> [-n <index>] [<key chain>...] [<value>]
    pm --move [--no-parse-flag] <source scope> <source index> <target scope> <target index>
    pm --import|--export [<file path>]
    pm --reset-passphrase
    pm --config [<config key>] [<config value>]
    pm --help|--version

Options:
    -n <index>                 Index of document under the <scope>. Under query mode, string value "all" is allowed to fetch all. Under create mode, a new document would be created if index is out of range. Default: 0
    --index=<index>            Same as "-n <index>".
    -A                         Alias to "-n all".
    -s, --search               Search mode. Search scope(s) that contains object/sentence key by texts specified. All positional arguments are treated as a single string separated by white space. Fuzzy matching is enabled by default.
    -e, -m, --edit             Edit mode. Modify existing sentence in a document by specified <key chain> and <value>.
    -i, --insert               Insert a new document into <index> specified instead of editing existing one. If specified, flag 'create' would be treated as true anyway.
    -c, --create               Create mode. Create new object and sentence if any key in <key chain> does not exist.
    -d, --delete               Delete mode. Delete a sentence by <key chain> specified. Empty document and scope would be cleaned automatically.
    -f, --force                Under edit mode, force to overwrite even if any key in <key chain> points to an existing object. Under delete mode, force to delete even if the deleting target is a document or non-empty object.
    -U, --no-fuzzy             Disable fuzzy matching under query or search mode.
    --no-parse-flag            If specified, any flag occurring after the first non-flag input would not be parsed.
    --move                     Move a document from one position to another. <target scope> would be created if it does not exist. Source document would be deleted first and then be inserted into <target index> under <target scope>. Empty scope would be cleaned automatically.
    --import                   Import data from file. If <file path> is omitted, read from stdin.
    --export                   Export data to file. If <file path> is omitted, write to stdout.
    --reset-passphrase         Reset encryption passphrase.
    --config                   List current configurations, set a user config entry by <config key> and <config value>, or reset a config entry by leaving <config value> empty.
    -h, --help                 Print this help message.
    -v, --version              Print version number.

PManager helps manage your secret information efficiently. Your private data is encrypted and stored securely. To access data, please set up and keep in mind your own passphrase.

"pm" command works under different modes by provided flags. If no flag is specified, pm is under query mode by default. It would fetch object or sentence value by specified <key chain> in the first document under the provided <scope>. <scope> query enables fuzzy matching by default (use "*" to fetch all scopes). One <scope> can have multiple documents which are distinguished by <index> value. A <document> contains nested objects and sentences which are key-value pairs with <value> being string that can be queried by <key chain>. <key chain> is a list of keys that are separated by white space.
```

## Install / Upgrade
```bash
$ npm install -g pmanager
$ npm update -g pmanager
```

## Getting Start
```bash
$ pm --help
$ pm scopeDemo
```
