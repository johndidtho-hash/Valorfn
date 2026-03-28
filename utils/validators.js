const validateUsername = (username) => {
    if (!username || typeof username !== 'string') return false;
    return username.length >= 3 && username.length <= 32 && /^[a-zA-Z0-9_\-\.\s]+$/.test(username);
};

const validateEpicId = (id) => {
    if (!id || typeof id !== 'string') return false;
    return /^[a-f0-9]{32}$/i.test(id);
};

const validateInviteCode = (code) => {
    if (!code || typeof code !== 'string') return false;
    return code.length === 8 && /^[A-Z0-9]+$/.test(code);
};

const sanitizeInput = (input) => {
    if (!input || typeof input !== 'string') return '';
    return input.replace(/[<>]/g, '').trim();
};

const isValidDiscordId = (id) => {
    if (!id || typeof id !== 'string') return false;
    return /^\d{17,20}$/.test(id);
};

const validateCosmeticName = (name) => {
    if (!name || typeof name !== 'string') return false;
    const sanitized = sanitizeInput(name);
    return sanitized.length >= 2 && sanitized.length <= 50;
};

module.exports = {
    validateUsername,
    validateEpicId,
    validateInviteCode,
    sanitizeInput,
    isValidDiscordId,
    validateCosmeticName
};
