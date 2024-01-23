import path from 'path';
import url from 'url';
import fs from 'fs';


const sysAppDataFolder = process.env.APPDATA ||
    (process.platform === 'darwin' ?
        path.join(process.env.HOME, 'Library', 'Preferences') :
        path.join(process.env.HOME, '.local', 'share')
    );
const pmDataFolder = process.env.PMENV === 'dev' ?
    path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..', 'pmdata') :
    path.join(sysAppDataFolder, 'pmanager');

function _writeConfig(config) {
    try {
        let configText = JSON.stringify(config, null, 2);
        fs.writeFileSync(configPath, configText, 'utf8');
    } catch (err) {
        console.error("Failed to write to user config file: %s", res.message);
        process.exit(0);
    }
}

// initialise user config file if non-existent
const configPath = path.join(pmDataFolder, 'config.json');
if (!fs.existsSync(configPath)) {
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
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
    _userConfig = fs.readFileSync(configPath, 'utf8');
    _userConfig = JSON.parse(_userConfig);
} catch (err) {
    console.error("Failed to read or parse user config file: %s", err.message);
    process.exit(0);
}

// merge configs
const config = { ..._defaultConfig, ..._userConfig };

/**
 * Update user config file by key and value specified.
 * Unset a key by passing empty value.
 */
function updateUserConfig(key, value) {
    if (value === undefined || value === "") {
        delete _userConfig[key];
    } else {
        _userConfig[key] = value;
    }
    _writeConfig(_userConfig);
}

export { config, configPath, updateUserConfig };
