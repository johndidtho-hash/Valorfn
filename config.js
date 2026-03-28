require('dotenv').config();

const config = {
    // Discord
    discord: {
        token: process.env.DISCORD_TOKEN,
        clientId: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
        serverId: process.env.SERVER_ID,
        ownerId: process.env.OWNER_ID
    },
    
    // Roles
    roles: {
        members: process.env.ROLE_MEMBERS,
        linked: process.env.ROLE_LINKED,
        premium: process.env.ROLE_PREMIUM,
        elite: process.env.ROLE_ELITE
    },
    
    // Channels
    channels: {
        welcome: process.env.CHANNEL_WELCOME,
        giveaway: process.env.CHANNEL_GIVEAWAY,
        fortniteNews: process.env.CHANNEL_FORTNITE_NEWS,
        botCommands: process.env.CHANNEL_BOT_COMMANDS,
        premiumCommands: process.env.CHANNEL_PREMIUM_COMMANDS,
        modLog: process.env.CHANNEL_MOD_LOG,
        leaderboard: process.env.CHANNEL_LEADERBOARD,
        dailyChallenges: process.env.CHANNEL_DAILY_CHALLENGES
    },
    
    // OpenAI
    openai: {
        apiKey: process.env.OPENAI_API_KEY
    },
    
    // Epic Games
    epic: {
        clientId: process.env.EPIC_CLIENT_ID,
        clientSecret: process.env.EPIC_CLIENT_SECRET,
        bptClientId: process.env.EPIC_BPT_CLIENT_ID,
        bptClientSecret: process.env.EPIC_BPT_CLIENT_SECRET
    },
    
    // Fortnite API
    fortnite: {
        apiKey: process.env.FORTNITE_API_KEY,
        baseUrl: 'https://fortnite-api.com'
    },
    
    // Pricing
    pricing: {
        premiumMonthly: parseFloat(process.env.PREMIUM_MONTHLY_PRICE) || 4.99,
        premiumYearly: parseFloat(process.env.PREMIUM_YEARLY_PRICE) || 39.99,
        eliteMonthly: parseFloat(process.env.ELITE_MONTHLY_PRICE) || 9.99,
        eliteYearly: parseFloat(process.env.ELITE_YEARLY_PRICE) || 79.99,
        eliteLifetime: parseFloat(process.env.ELITE_LIFETIME_PRICE) || 199.99
    },
    
    // Invite Costs
    invites: {
        premiumCost: parseInt(process.env.PREMIUM_INVITE_COST) || 35,
        eliteCost: parseInt(process.env.ELITE_INVITE_COST) || 100,
        antiCheatDays: 14
    },
    
    // Feature Limits
    limits: {
        freeLockerSlots: parseInt(process.env.FREE_LOCKER_SLOTS) || 5,
        premiumLockerSlots: parseInt(process.env.PREMIUM_LOCKER_SLOTS) || 25,
        eliteLockerSlots: parseInt(process.env.ELITE_LOCKER_SLOTS) || 100
    },
    
    // Security
    security: {
        encryptionKey: process.env.ENCRYPTION_KEY
    },
    
    // Intervals
    intervals: {
        newsCheck: parseInt(process.env.NEWS_CHECK_INTERVAL) || 30,
        leaderboardUpdate: parseInt(process.env.LEADERBOARD_UPDATE_INTERVAL) || 60
    }
};

// Validation
function validateConfig() {
    const required = [
        config.discord.token,
        config.discord.clientId,
        config.fortnite.apiKey,
        config.security.encryptionKey
    ];
    
    for (const value of required) {
        if (!value || value.includes('your-') || value.includes('REPLACE_')) {
            throw new Error('Missing required configuration. Please check your .env file.');
        }
    }
}

module.exports = { ...config, validate: validateConfig };
