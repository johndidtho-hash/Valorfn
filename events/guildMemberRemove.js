const { Events } = require('discord.js');
const config = require('../config');
const inviteTracker = require('../services/invite-tracker');
const logger = require('../utils/logger');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member, client) {
        try {
            // Only process for the configured server
            if (member.guild.id !== config.discord.serverId) return;

            // Track the leave (for analytics, doesn't remove invites)
            await inviteTracker.trackLeave(member);

            logger.info(`Member left: ${member.user.tag}`);
        } catch (error) {
            logger.error('Error in guildMemberRemove event:', error);
        }
    }
};
