const path = require('path');


const sysAppDataFolder = process.env.APPDATA ||
    (process.platform === 'darwin' ?
        path.join(process.env.HOME, 'Library', 'Preferences') :
        path.join(process.env.HOME, '.local', 'share')
    );
const pmDataFolder = process.env.PMENV === 'dev' ?
    path.join(__dirname, '..') :
    path.join(sysAppDataFolder, 'pmanager');

const config = {
    fileStoragePath: path.join(pmDataFolder, 'PMDATA'),
    passphrase: 'AVERYSTRONGPASSWORD'
};

module.exports = config;
