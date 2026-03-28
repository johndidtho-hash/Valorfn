const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const config = require('../../config');
const modLog = require('../../services/mod-log-service');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Delete a specified number of messages (Owner only)')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Number of messages to delete (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        // Check if user is owner
        if (interaction.user.id !== config.discord.ownerId) {
            return interaction.reply({
                embeds: [createErrorEmbed('Unauthorized', 'Only the server owner can use this command.')],
                ephemeral: true
            });
        }

        const amount = interaction.options.getInteger('amount');

        try {
            const messages = await interaction.channel.bulkDelete(amount, true);
            
            modLog.log('PURGE', {
                amount: messages.size,
                channel: interaction.channel.id,
                executor: interaction.user.id
            }, null, interaction.user.id);

            const embed = createSuccessEmbed(
                'Messages Deleted',
                `Successfully deleted ${messages.size} message(s).`
            );

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            logger.error('Purge error:', error);
            await interaction.reply({
                embeds: [createErrorEmbed('Error', 'Failed to delete messages. Messages older than 14 days cannot be bulk deleted.')],
                ephemeral: true
            });
        }
    }
};
