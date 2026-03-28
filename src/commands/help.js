/**
 * /help command — lists all available commands.
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available ValorFN commands'),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle('📖 ValorFN — Command Reference')
      .setDescription('ValorFN integrates your Epic Games account with Discord to surface Fortnite stats and more.')
      .addFields(
        {
          name:  '🔗 `/link`',
          value: 'Connect your Epic Games account via OAuth. Required before using account-specific features.',
        },
        {
          name:  '🔓 `/unlink`',
          value: 'Disconnect your Epic Games account from ValorFN.',
        },
        {
          name:  '👤 `/profile`',
          value: 'View your linked Epic Games profile and token status.',
        },
        {
          name:  '🎮 `/stats [username]`',
          value:
            'View Fortnite Battle Royale statistics. ' +
            'Omit `username` to use your linked account, or provide any Epic display name.',
        },
        {
          name:  "🛒 `/shop`",
          value: "Browse today's Fortnite item shop.",
        },
        {
          name:  '❓ `/help`',
          value: 'Show this message.',
        }
      )
      .setFooter({ text: 'ValorFN • Powered by Discord.js & FortniteAPI.io' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
