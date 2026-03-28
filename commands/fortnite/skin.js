const { SlashCommandBuilder } = require('discord.js');
const fortniteAPI = require('../../services/fortnite-api');
const { createCosmeticEmbed, createErrorEmbed } = require('../../utils/embeds');
const { validateCosmeticName } = require('../../utils/validators');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skin')
        .setDescription('Search for a Fortnite cosmetic')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Name of the cosmetic')
                .setRequired(true)
                .setAutocomplete(true)),

    async execute(interaction) {
        const name = interaction.options.getString('name');

        if (!validateCosmeticName(name)) {
            return interaction.reply({
                embeds: [createErrorEmbed('Invalid Name', 'Please provide a valid cosmetic name (2-50 characters).')],
                ephemeral: true
            });
        }

        await interaction.deferReply();

        try {
            const cosmetic = await fortniteAPI.findCosmeticByName(name);

            if (!cosmetic) {
                // Try searching
                const search = await fortniteAPI.searchCosmetics(name);
                if (search.data && search.data.length > 0) {
                    const found = search.data[0];
                    const embed = createCosmeticEmbed(found);
                    await interaction.editReply({ embeds: [embed] });
                    return;
                }

                return interaction.editReply({
                    embeds: [createErrorEmbed('Not Found', `Could not find a cosmetic named "${name}". Try a different name or check spelling.`)]
                });
            }

            const embed = createCosmeticEmbed(cosmetic);
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            logger.error('Skin command error:', error);
            await interaction.editReply({
                embeds: [createErrorEmbed('Error', 'Failed to search for cosmetic. Please try again later.')]
            });
        }
    },

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        
        if (focusedValue.length < 2) {
            await interaction.respond([]);
            return;
        }

        try {
            const cosmetics = await fortniteAPI.getCachedCosmetics();
            const filtered = cosmetics
                .filter(c => c.name.toLowerCase().includes(focusedValue.toLowerCase()))
                .slice(0, 25)
                .map(c => ({
                    name: `${c.name} (${c.type?.displayValue || 'Skin'})`,
                    value: c.name
                }));

            await interaction.respond(filtered);
        } catch (error) {
            await interaction.respond([]);
        }
    }
};
