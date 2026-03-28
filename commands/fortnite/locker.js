const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { get, all } = require('../../database/connection');
const fortniteAPI = require('../../services/fortnite-api');
const { createErrorEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('locker')
        .setDescription('View all cosmetics in your locker'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            // Get user's locker
            const locker = await all(
                'SELECT cosmetic_id FROM lockers WHERE user_id = ?',
                [interaction.user.id]
            );

            if (locker.length === 0) {
                return interaction.editReply({
                    embeds: [createErrorEmbed('Empty Locker', 'Your locker is empty!')]
                });
            }

            // Fetch cosmetic details
            const cosmetics = [];
            for (const item of locker) {
                try {
                    const response = await fortniteAPI.getCosmeticById(item.cosmetic_id);
                    if (response.data) cosmetics.push(response.data);
                } catch (e) {
                    // Skip invalid IDs
                }
            }

            // Create image gallery embed
            const embed = new EmbedBuilder()
                .setColor(0x9B59B6)
                .setTitle(`🎒 ${interaction.user.username}'s Locker (${cosmetics.length} items)`)
                .setDescription('Showing all your saved cosmetics:');

            // Add up to 25 cosmetics with their images
            cosmetics.slice(0, 25).forEach(cosmetic => {
                const icon = cosmetic.images?.icon || cosmetic.images?.smallIcon || null;
                const rarity = cosmetic.rarity?.displayValue || 'Common';
                
                embed.addFields({
                    name: `${cosmetic.name}`,
                    value: `Type: ${cosmetic.type?.displayValue || 'Unknown'}\nRarity: ${rarity}`,
                    inline: true
                });
            });

            // Set main image to first cosmetic
            if (cosmetics[0]?.images?.featured) {
                embed.setImage(cosmetics[0].images.featured);
            } else if (cosmetics[0]?.images?.icon) {
                embed.setImage(cosmetics[0].images.icon);
            }

            embed.setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            logger.error('Locker command error:', error);
            await interaction.editReply({
                embeds: [createErrorEmbed('Error', 'Failed to load locker.')]
            });
        }
    }
};
