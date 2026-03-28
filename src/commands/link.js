/**
 * /link command — starts the Epic Games OAuth flow for the invoking user.
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { beginOAuthFlow } = require('../services/auth');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('Link your Epic Games account to ValorFN'),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    // Defer ephemerally so only the invoking user sees the response.
    await interaction.deferReply({ ephemeral: true });

    try {
      const authUrl = await beginOAuthFlow(interaction.user.id);

      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('🔗 Link your Epic Games account')
        .setDescription(
          'Click the button below to authorise ValorFN to access your Epic Games account.\n\n' +
          'This allows the bot to retrieve your Fortnite statistics and display them in Discord.'
        )
        .addFields({ name: 'Authorisation URL', value: `[Click here to link](${authUrl})` })
        .setFooter({ text: 'This link expires in 10 minutes.' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      logger.error('Error in /link command', { userId: interaction.user.id, error: err.message });
      await interaction.editReply({
        content: '❌ Failed to generate the authorisation link. Please try again later.',
      });
    }
  },
};
