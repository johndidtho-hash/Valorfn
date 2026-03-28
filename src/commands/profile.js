/**
 * /profile command — shows the invoking user's linked Epic Games profile.
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserByDiscordId } = require('../services/database');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View your linked Epic Games profile'),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const user = await getUserByDiscordId(interaction.user.id);

      if (!user || !user.epic_account_id) {
        return interaction.editReply({
          content: "ℹ️ You don't have an Epic Games account linked. Use `/link` to connect one.",
        });
      }

      const linkedAt = user.updated_at
        ? `<t:${user.updated_at}:R>`
        : 'Unknown';

      const tokenStatus =
        user.token_expires_at && user.token_expires_at > Math.floor(Date.now() / 1000)
          ? '✅ Valid'
          : '⚠️ Expired (will refresh automatically)';

      const embed = new EmbedBuilder()
        .setColor(0x00d4aa)
        .setTitle('👤 Your Epic Games Profile')
        .addFields(
          { name: 'Discord',           value: `${interaction.user.tag}`,  inline: true },
          { name: 'Epic Display Name', value: user.epic_display_name,     inline: true },
          { name: 'Epic Account ID',   value: `\`${user.epic_account_id}\``, inline: false },
          { name: 'Token Status',      value: tokenStatus,                inline: true },
          { name: 'Last Updated',      value: linkedAt,                   inline: true }
        )
        .setThumbnail(interaction.user.displayAvatarURL())
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      logger.error('Error in /profile command', { userId: interaction.user.id, error: err.message });
      await interaction.editReply({ content: '❌ Failed to load your profile. Please try again later.' });
    }
  },
};
