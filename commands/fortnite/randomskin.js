const { SlashCommandBuilder } = require('discord.js');
const fortniteAPI = require('../../services/fortnite-api');
const { createCosmeticEmbed, createErrorEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('randomskin')
        .setDescription('Get a random Fortnite cosmetic')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of cosmetic')
                .setRequired(false)
                .addChoices(
                    { name: '🎭 Outfit', value: 'outfit' },
                    { name: '🎒 Back Bling', value: 'backpack' },
                    { name: '⛏️ Pickaxe', value: 'pickaxe' },
                    { name: '🪂 Glider', value: 'glider' },
                    { name: '🚗 Car', value: 'car' },
                    { name: '🎵 Jam Track', value: 'track' },
                    { name: '🎸 Instrument', value: 'instrument' }
                )),

    async execute(interaction) {
        const type = interaction.options.getString('type');
        
        await interaction.deferReply();

        try {
            let cosmetics;
            
            switch (type) {
                case 'car':
                    const cars = await fortniteAPI.getCars();
                    cosmetics = cars.data;
                    break;
                case 'track':
                    const tracks = await fortniteAPI.getTracks();
                    cosmetics = tracks.data;
                    break;
                case 'instrument':
                    const instruments = await fortniteAPI.getInstruments();
                    cosmetics = instruments.data;
                    break;
                default:
                    const br = await fortniteAPI.getBRCosmetics();
                    cosmetics = br.data;
                    if (type) {
                        cosmetics = cosmetics.filter(c => c.type?.value === type);
                    }
                    break;
            }

            if (!cosmetics || cosmetics.length === 0) {
                return interaction.editReply({
                    embeds: [createErrorEmbed('No Items', 'No cosmetics found for the selected type.')]
                });
            }

            const random = cosmetics[Math.floor(Math.random() * cosmetics.length)];
            const embed = createCosmeticEmbed(random);
            
            embed.setTitle(`🎲 Random ${type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Cosmetic'}: ${random.name}`);

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            logger.error('Randomskin command error:', error);
            await interaction.editReply({
                embeds: [createErrorEmbed('Error', 'Failed to fetch random cosmetic. Please try again.')]
            });
        }
    }
};
