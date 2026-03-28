const CryptoJS = require('crypto-js');
const config = require('../config');

const ENCRYPTION_KEY = config.security.encryptionKey;

function encrypt(text) {
    if (!text) return null;
    return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
}

function decrypt(encryptedText) {
    if (!encryptedText) return null;
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
        return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
        return null;
    }
}

function hash(text) {
    return CryptoJS.SHA256(text).toString();
}

module.exports = {
    encrypt,
    decrypt,
    hash
};
