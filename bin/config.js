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

const defaultConfig = {
    fileStoragePath: path.join(pmDataFolder, 'PMDATA'),
    passphrase: 'AVERYSTRONGPASSWORD'
};

// initialise config file if non-existent
const configPath = path.join(pmDataFolder, 'config.json');
if (!fs.existsSync(configPath)) {
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    try {
        let configText = JSON.stringify({}, null, 4);
        fs.writeFileSync(configPath, configText, 'utf8');
    } catch (err) {
        console.error("Failed to initialise config file: %s", res.message);
        process.exit(0);
    }
}

// read config file
let config;
try {
    let configText = fs.readFileSync(configPath, 'utf8');
    let fileConfig = JSON.parse(configText);
    config = { ...defaultConfig, ...fileConfig };
} catch (err) {
    console.error("Failed to read or parse config file: %s", err.message);
    process.exit(0);
}

module.exports = config;
