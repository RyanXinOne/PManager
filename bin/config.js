const appDataFolder = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share");

const config = {
    fileStoragePath: process.env.PMENV === 'dev' ? `${__dirname}/../dataStorage.json` : `${appDataFolder}/pmanager/dataStorage.json`,
    passphrase: 'AVERYSTRONGPASSWORD'
};

module.exports = config;
