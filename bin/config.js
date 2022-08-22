const path = require('path');
const fs = require('fs');


const sysAppDataFolder = process.env.APPDATA ||
    (process.platform === 'darwin' ?
        path.join(process.env.HOME, 'Library', 'Preferences') :
        path.join(process.env.HOME, '.local', 'share')
    );
const pmDataFolder = process.env.PMENV === 'dev' ?
    path.join(__dirname, '..', 'pmdata') :
    path.join(sysAppDataFolder, 'pmanager');

function _writeConfig(config) {
    try {
        let configText = JSON.stringify(config, null, 2);
        fs.writeFileSync(_configPath, configText, 'utf8');
    } catch (err) {
        console.error("Failed to write to user config file: %s", res.message);
        process.exit(0);
    }
}

// initialise user config file if non-existent
const _configPath = path.join(pmDataFolder, 'config.json');
if (!fs.existsSync(_configPath)) {
    fs.mkdirSync(path.dirname(_configPath), { recursive: true });
    _writeConfig({});
}

// built-in default config
const _defaultConfig = {
    fileStoragePath: path.join(pmDataFolder, 'PMDATA'),
    doNotAskPassphraseInSec: "300"
};

// read user config
let _userConfig;
try {
    _userConfig = fs.readFileSync(_configPath, 'utf8');
    _userConfig = JSON.parse(_userConfig);
} catch (err) {
    console.error("Failed to read or parse user config file: %s", err.message);
    process.exit(0);
}

// merge configs
let _config = { ..._defaultConfig, ..._userConfig };

/**
 * Update user config file by key and value specified.
 * Unset a key by passing empty value.
 */
function _updateUserConfigValue(key, value) {
    if (value === undefined || value === "") {
        delete _userConfig[key];
    } else {
        _userConfig[key] = value;
    }
    _writeConfig(_userConfig);
}

exports.configPath = _configPath;
exports.config = _config;
exports.updateConfig = _updateUserConfigValue;
