const { SlashCommandBuilder } = require('discord.js');
const epicOAuth = require('../../services/epic-oauth');
const { getDb } = require('../../database/connection');
const config = require('../../config');
const { createSuccessEmbed, createErrorEmbed, createWarningEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlink')
        .setDescription('Unlink your Epic Games account from the bot'),

    async execute(interaction) {
        try {
            const db = getDb();
            const user = db.prepare('SELECT is_linked, epic_username FROM users WHERE discord_id = ?')
                .get(interaction.user.id);

            if (!user?.is_linked) {
                return interaction.reply({
                    embeds: [createWarningEmbed('Not Linked', 'Your Epic Games account is not currently linked.')],
                    ephemeral: true
                });
            }

            const result = await epicOAuth.unlinkAccount(interaction.user.id);

            if (result.success) {
                // Remove Linked role
                const member = interaction.member;
                const linkedRole = interaction.guild.roles.cache.get(config.roles.linked);
                
                if (linkedRole && member.roles.cache.has(linkedRole.id)) {
                    await member.roles.remove(linkedRole);
                }

                await interaction.reply({
                    embeds: [createSuccessEmbed(
                        'Unlinked Successfully', 
                        `Your Epic account **${user.epic_username}** has been unlinked.\nYour Linked role has been removed.`
                    )],
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    embeds: [createErrorEmbed('Error', 'Failed to unlink account. Please try again.')],
                    ephemeral: true
                });
            }
        } catch (error) {
            logger.error('Unlink command error:', error);
            await interaction.reply({
                embeds: [createErrorEmbed('Error', 'An error occurred while unlinking your account.')],
                ephemeral: true
            });
        }
    }
};
