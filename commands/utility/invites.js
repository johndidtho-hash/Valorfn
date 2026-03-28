const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const inviteTracker = require('../../services/invite-tracker');
const { createErrorEmbed, createInfoEmbed, createSuccessEmbed } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invites')
        .setDescription('Check your invite count and history')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to check (defaults to you)')
                .setRequired(false)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        
        try {
            const inviteCount = await inviteTracker.getInviteCount(targetUser.id);
            const invitedUsers = await inviteTracker.getInvitedUsers(targetUser.id);

            const embed = createInfoEmbed(
                `📊 ${targetUser.username}'s Invites`,
                `**Total Invites:** ${inviteCount}\n\n` +
                `**Recent Invited Users:**\n` +
                (invitedUsers.length > 0 
                    ? invitedUsers.slice(0, 10).map(u => `<@${u.invited_discord_id}> - <t:${u.created_at}:R>`).join('\n')
                    : 'No invites yet. Share your invite link to earn rewards!')
            );

            embed.setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));

            // Progress to Premium
            const premiumProgress = Math.min(100, (inviteCount / config.invites.premiumCost) * 100);
            const eliteProgress = Math.min(100, (inviteCount / config.invites.eliteCost) * 100);

            embed.addFields(
                { 
                    name: '⭐ Premium Progress', 
                    value: `${inviteCount}/${config.invites.premiumCost} invites (${premiumProgress.toFixed(0)}%)`, 
                    inline: true 
                },
                { 
                    name: '👑 Elite Progress', 
                    value: `${inviteCount}/${config.invites.eliteCost} invites (${eliteProgress.toFixed(0)}%)`, 
                    inline: true 
                }
            );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'Failed to fetch invite data. Please try again.')],
                ephemeral: true 
            });
        }
    }
};
