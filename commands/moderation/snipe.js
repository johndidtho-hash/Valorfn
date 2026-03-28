const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { all } = require('../../database/connection');
const { createErrorEmbed, createInfoEmbed } = require('../../utils/embeds');
const config = require('../../config');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('snipe')
        .setDescription('View recently deleted messages from a user (Owner only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to snipe')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        // Check if user is owner
        if (interaction.user.id !== config.discord.ownerId) {
            return interaction.reply({
                embeds: [createErrorEmbed('Unauthorized', 'Only the server owner can use this command.')],
                ephemeral: true
            });
        }

        const targetUser = interaction.options.getUser('user');

        try {
            let query = `
                SELECT dm.*
                FROM deleted_messages dm
                WHERE dm.channel_id = ?
            `;
            let params = [interaction.channelId];

            if (targetUser) {
                query += ' AND dm.user_id = ?';
                params.push(targetUser.id);
            }

            query += ' ORDER BY dm.deleted_at DESC LIMIT 10';

            const messages = await all(query, params);

            if (messages.length === 0) {
                return interaction.reply({
                    embeds: [createInfoEmbed('No Deleted Messages', 'No recently deleted messages found in this channel.')],
                    ephemeral: true
                });
            }

            const embed = createInfoEmbed(
                '🕵️ Recently Deleted Messages',
                targetUser ? `Showing deleted messages from ${targetUser.username}` : 'Showing all recent deleted messages'
            );

            messages.forEach(msg => {
                const timestamp = `<t:${msg.deleted_at}:R>`;
                const user = targetUser || (msg.user_id ? `<@${msg.user_id}>` : 'Unknown');
                const content = msg.content.substring(0, 500) || '[No content]';
                
                embed.addFields({
                    name: `${user} - ${timestamp}`,
                    value: content,
                    inline: false
                });
            });

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            logger.error('Snipe error:', error);
            await interaction.reply({
                embeds: [createErrorEmbed('Error', 'Failed to retrieve deleted messages.')],
                ephemeral: true
            });
        }
    }
};
