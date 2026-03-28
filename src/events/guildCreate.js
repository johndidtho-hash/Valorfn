/**
 * Discord `guildCreate` event — fires when the bot joins a new server.
 */

const { Events, EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  name: Events.GuildCreate,
  once: false,

  /**
   * @param {import('discord.js').Guild} guild
   */
  async execute(guild) {
    logger.info('Bot joined a new guild', {
      guildId:   guild.id,
      guildName: guild.name,
      members:   guild.memberCount,
    });

    // Try to send a welcome message to the first text channel the bot can write to.
    const channel = guild.channels.cache.find(
      (ch) => ch.isTextBased() && ch.permissionsFor(guild.members.me)?.has('SendMessages')
    );

    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle('👋 Thanks for adding ValorFN!')
      .setDescription(
        'ValorFN lets you link your Epic Games account and view Fortnite statistics right inside Discord.\n\n' +
        'Get started with `/link` to connect your Epic Games account, then use `/stats` to see your stats!'
      )
      .addFields({ name: '📖 All commands', value: 'Run `/help` to see everything ValorFN can do.' })
      .setTimestamp();

    channel.send({ embeds: [embed] }).catch((err) => {
      logger.warn('Could not send welcome message', { guildId: guild.id, error: err.message });
    });
  },
};
