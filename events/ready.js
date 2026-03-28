const { Events } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        logger.info(`Ready! Logged in as ${client.user.tag}`);
        
        // Initialize invite cache
        client.guilds.cache.forEach(async (guild) => {
            try {
                const invites = await guild.invites.fetch();
                const inviteMap = new Map();
                invites.forEach(invite => inviteMap.set(invite.code, invite));
                client.invites = client.invites || new Map();
                client.invites.set(guild.id, inviteMap);
            } catch (error) {
                logger.error(`Error fetching invites for ${guild.name}:`, error);
            }
        });
    }
};
