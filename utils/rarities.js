const config = require('../config');

const rarityColors = {
    common: '#B1B1B1',
    uncommon: '#00FF00',
    rare: '#0080FF',
    epic: '#A335EE',
    legendary: '#FF8000',
    mythic: '#FFD700',
    exotic: '#00FFFF',
    icon_series: '#FF1493',
    marvel: '#ED1C24',
    dc: '#0078D7',
    dark: '#4B0082',
    frozen: '#00CED1',
    lava: '#FF4500',
    shadow: '#2F2F2F',
    slurp: '#00FFBF',
    star_wars: '#000000'
};

const rarityEmojis = {
    common: '⚪',
    uncommon: '🟢',
    rare: '🔵',
    epic: '🟣',
    legendary: '🟠',
    mythic: '🟡',
    exotic: '💎',
    icon_series: '🎵',
    marvel: '🦸',
    dc: '🦇',
    dark: '🌑',
    frozen: '❄️',
    lava: '🔥',
    shadow: '👤',
    slurp: '🥤',
    star_wars: '⚔️'
};

function getRarityColor(rarity) {
    return rarityColors[rarity?.toLowerCase()] || rarityColors.common;
}

function getRarityEmoji(rarity) {
    return rarityEmojis[rarity?.toLowerCase()] || rarityEmojis.common;
}

function getRarityValue(rarity) {
    const values = {
        common: 1,
        uncommon: 2,
        rare: 3,
        epic: 4,
        legendary: 5,
        mythic: 6,
        exotic: 7,
        icon_series: 6,
        marvel: 6,
        dc: 6
    };
    return values[rarity?.toLowerCase()] || 1;
}

module.exports = {
    rarityColors,
    rarityEmojis,
    getRarityColor,
    getRarityEmoji,
    getRarityValue
};
