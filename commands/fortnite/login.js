const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const epicOAuth = require('../../services/epic-oauth');
const config = require('../../config');
const { createSuccessEmbed, createErrorEmbed, createInfoEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('login')
        .setDescription('Link your Epic Games account to unlock more features'),

    async execute(interaction) {
        try {
            // Generate state parameter for security
            const state = Buffer.from(`${interaction.user.id}:${Date.now()}`).toString('base64');
            
            const authUrl = epicOAuth.getAuthorizationUrl(state);

            const embed = createInfoEmbed(
                '🔗 Link Epic Account',
                'Click the button below to securely link your Epic Games account.\n\n' +
                '**Benefits of linking:**\n' +
                '• Access your personal stats faster\n' +
                '• Unlock Linked role and commands\n' +
                '• Enhanced locker management\n' +
                '• Personalized AI coaching'
            );

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('🔗 Link Epic Account')
                        .setURL(authUrl)
                        .setStyle(ButtonStyle.Link),
                    new ButtonBuilder()
                        .setCustomId('unlink_account')
                        .setLabel('Unlink (if already linked)')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.reply({ embeds: [embed], components: [row], flags: [MessageFlags.Ephemeral] });
        } catch (error) {
            logger.error('Login command error:', error);
            await interaction.reply({
                embeds: [createErrorEmbed('Error', 'Failed to generate login link. Please try again.')],
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
};
