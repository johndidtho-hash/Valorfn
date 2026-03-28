/**
 * /stats command — displays Fortnite Battle Royale statistics.
 *
 * Usage:
 *   /stats              — shows stats for the invoking user's linked account
 *   /stats username:<n> — shows stats for any Epic display name
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getStatsByUsername, getStatsByAccountId, formatStats } = require('../services/fortniteApi');
const { getUserByDiscordId } = require('../services/database');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View Fortnite Battle Royale statistics')
    .addStringOption((option) =>
      option
        .setName('username')
        .setDescription('Epic Games display name (leave blank to use your linked account)')
        .setRequired(false)
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    await interaction.deferReply();

    const targetUsername = interaction.options.getString('username');

    try {
      let rawStats;

      if (targetUsername) {
        // Look up by the provided username.
        rawStats = await getStatsByUsername(targetUsername);
      } else {
        // Fall back to the user's linked Epic account.
        const user = await getUserByDiscordId(interaction.user.id);

        if (!user || !user.epic_account_id) {
          return interaction.editReply({
            content:
              "ℹ️ You don't have an Epic Games account linked. " +
              'Use `/link` to connect one, or provide a username with `/stats username:<name>`.',
          });
        }

        rawStats = await getStatsByAccountId(user.epic_account_id);
      }

      const stats = formatStats(rawStats);

      if (!stats) {
        return interaction.editReply({
          content: '❌ No stats found for that player. They may have private stats or have never played.',
        });
      }

      const hoursPlayed = (stats.minutesPlayed / 60).toFixed(1);

      const embed = new EmbedBuilder()
        .setColor(0x00d4aa)
        .setTitle(`🎮 Fortnite Stats — ${stats.username}`)
        .addFields(
          { name: '🏆 Wins',         value: stats.wins.toLocaleString(),    inline: true },
          { name: '💀 Kills',        value: stats.kills.toLocaleString(),   inline: true },
          { name: '🎯 K/D Ratio',    value: stats.kd,                       inline: true },
          { name: '🎲 Matches',      value: stats.matches.toLocaleString(), inline: true },
          { name: '📈 Win Rate',     value: `${stats.winRate}%`,            inline: true },
          { name: '⏱️ Hours Played', value: hoursPlayed,                    inline: true }
        )
        .setFooter({ text: 'Powered by FortniteAPI.io' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      logger.error('Error in /stats command', {
        userId: interaction.user.id,
        targetUsername,
        error: err.message,
      });

      const isNotFound = err.response?.status === 404;
      await interaction.editReply({
        content: isNotFound
          ? '❌ Player not found. Check the username and try again.'
          : '❌ Failed to fetch stats. Please try again later.',
      });
    }
  },
};
