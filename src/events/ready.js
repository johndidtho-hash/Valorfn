/**
 * Discord `ready` event — fires once when the bot has successfully connected
 * and is ready to receive interactions.
 */

const { Events, ActivityType } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  name: Events.ClientReady,
  once: true,

  /**
   * @param {import('discord.js').Client} client
   */
  execute(client) {
    logger.info('Discord bot is online', {
      tag:    client.user.tag,
      guilds: client.guilds.cache.size,
    });

    client.user.setPresence({
      activities: [
        {
          name: '/help | Fortnite Stats',
          type: ActivityType.Playing,
        },
      ],
      status: 'online',
    });
  },
};
