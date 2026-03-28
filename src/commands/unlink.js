/**
 * /unlink command — removes the Epic Games account link for the invoking user.
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { unlinkAccount } = require('../services/auth');
const { getUserByDiscordId } = require('../services/database');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlink')
    .setDescription('Unlink your Epic Games account from ValorFN'),

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

      await unlinkAccount(interaction.user.id);

      const embed = new EmbedBuilder()
        .setColor(0xff4444)
        .setTitle('🔓 Epic Games account unlinked')
        .setDescription(
          `Your Epic Games account **${user.epic_display_name}** has been successfully unlinked.\n\n` +
          'Use `/link` at any time to reconnect your account.'
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      logger.error('Error in /unlink command', { userId: interaction.user.id, error: err.message });
      await interaction.editReply({
        content: '❌ Failed to unlink your account. Please try again later.',
      });
    }
  },
};
