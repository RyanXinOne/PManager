const appDataFolder = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share");

const config = {
    fileStoragePath: process.env.PMENV === 'dev' ? `${__dirname}/../PMDATA` : `${appDataFolder}/pmanager/PMDATA`,
    passphrase: 'AVERYSTRONGPASSWORD'
};

module.exports = config;
