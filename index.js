const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
require('dotenv').config();

const config = require('./config');
const database = require('./database/connection');
const NewsService = require('./services/news-service');
const LeaderboardService = require('./services/leaderboard-service');
const DailyChallengeService = require('./services/daily-challenge-service');
const logger = require('./utils/logger');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ]
});

client.commands = new Collection();
client.cooldowns = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;
    
    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        const command = require(filePath);
        
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            logger.info(`Loaded command: ${command.data.name}`);
        } else {
            logger.warn(`Command at ${filePath} is missing required properties`);
        }
    }
}

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
    logger.info(`Loaded event: ${event.name}`);
}

// Initialize services
client.once(Events.ClientReady, async () => {
    logger.info(`Bot logged in as ${client.user.tag}`);
    
    // Initialize database (now async)
    await database.init();
    
    // Start news service
    const newsService = new NewsService(client);
    cron.schedule(`*/${process.env.NEWS_CHECK_INTERVAL || 30} * * * *`, () => {
        newsService.checkForUpdates();
    });
    
    // Start leaderboard updates
    const leaderboardService = new LeaderboardService(client);
    cron.schedule(`*/${process.env.LEADERBOARD_UPDATE_INTERVAL || 60} * * * *`, () => {
        leaderboardService.updateLeaderboards();
    });
    
    // Start daily challenges
    const dailyChallengeService = new DailyChallengeService(client);
    cron.schedule('0 0 * * *', () => {
        dailyChallengeService.postNewChallenge();
    });
    
    // Update activity
    client.user.setActivity('/help | ValorFN', { type: 3 });
});

// Error handling with full stack traces
process.on('unhandledRejection', (error) => {
    console.error('[UNHANDLED REJECTION]', error);
    console.error(error.stack);
});

process.on('uncaughtException', (error) => {
    console.error('[UNCAUGHT EXCEPTION]', error);
    console.error(error.stack);
});

// Start web server for OAuth callbacks
require('./server.js');

// Start Discord bot
client.login(config.discord.token);
