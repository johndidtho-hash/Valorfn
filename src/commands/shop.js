/**
 * /shop command — displays a summary of the current Fortnite item shop.
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getItemShop } = require('../services/fortniteApi');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription("View today's Fortnite item shop"),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    await interaction.deferReply();

    try {
      const shopData = await getItemShop();

      if (!shopData || !shopData.shop) {
        return interaction.editReply({ content: '❌ Could not retrieve the item shop right now.' });
      }

      // Show the first 10 featured items to stay within embed limits.
      const items = shopData.shop.slice(0, 10);

      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle("🛒 Today's Fortnite Item Shop")
        .setDescription(`Showing ${items.length} of ${shopData.shop.length} items`)
        .setTimestamp()
        .setFooter({ text: 'Powered by FortniteAPI.io' });

      for (const item of items) {
        const name  = item.displayName ?? item.mainId ?? 'Unknown Item';
        const price = item.price?.finalPrice ?? item.price ?? '?';
        const rarity = item.rarity?.displayValue ?? '';
        embed.addFields({
          name:   `${name}${rarity ? ` (${rarity})` : ''}`,
          value:  `${price} V-Bucks`,
          inline: true,
        });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      logger.error('Error in /shop command', { userId: interaction.user.id, error: err.message });
      await interaction.editReply({ content: '❌ Failed to fetch the item shop. Please try again later.' });
    }
  },
};
