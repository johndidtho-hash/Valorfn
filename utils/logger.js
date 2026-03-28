const config = require('../config');

const LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

const currentLevel = LEVELS[config.logLevel?.toUpperCase()] || LEVELS.INFO;

function log(level, message, ...args) {
    if (LEVELS[level] < currentLevel) return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}]`;
    
    if (args.length > 0) {
        console.log(prefix, message, ...args);
    } else {
        console.log(prefix, message);
    }
}

module.exports = {
    debug: (msg, ...args) => log('DEBUG', msg, ...args),
    info: (msg, ...args) => log('INFO', msg, ...args),
    warn: (msg, ...args) => log('WARN', msg, ...args),
    error: (msg, ...args) => log('ERROR', msg, ...args)
};
