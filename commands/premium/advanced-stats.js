const { SlashCommandBuilder } = require('discord.js');
const fortniteAPI = require('../../services/fortnite-api');
const { createStatsEmbed, createErrorEmbed, createInfoEmbed } = require('../../utils/embeds');
const { validateUsername } = require('../../utils/validators');
const config = require('../../config');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('advanced-stats')
        .setDescription('View advanced stats breakdown (Premium/Elite only)')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Epic Games username')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('Game mode')
                .setRequired(false)
                .addChoices(
                    { name: '🏆 Overall', value: 'overall' },
                    { name: '🎮 Solo', value: 'solo' },
                    { name: '👥 Duo', value: 'duo' },
                    { name: '👨‍👩‍👧‍👦 Squad', value: 'squad' },
                    { name: '⚔️ LTM', value: 'ltm' }
                )),

    async execute(interaction) {
        // Check premium access
        const member = interaction.member;
        const hasAccess = member.roles.cache.has(config.roles.premium) || 
                         member.roles.cache.has(config.roles.elite);
        
        if (!hasAccess) {
            return interaction.reply({
                embeds: [createErrorEmbed(
                    'Premium Required', 
                    'This command requires ⭐ Premium or 👑 Elite tier.\nUse `/claim` to unlock with invites or `/membership` for purchase options.'
                )],
                ephemeral: true
            });
        }

        const username = interaction.options.getString('username');
        const mode = interaction.options.getString('mode') || 'overall';

        if (!validateUsername(username)) {
            return interaction.reply({
                embeds: [createErrorEmbed('Invalid Username', 'Please provide a valid Epic Games username.')],
                ephemeral: true
            });
        }

        await interaction.deferReply();

        try {
            const response = await fortniteAPI.getStats(username);
            
            if (!response.data || !response.data.stats) {
                return interaction.editReply({
                    embeds: [createErrorEmbed('Player Not Found', `Could not find stats for "${username}".`)]
                });
            }

            const stats = response.data.stats.all || {};
            const modeStats = stats[mode] || {};

            const { EmbedBuilder } = require('discord.js');
            
            const embed = new EmbedBuilder()
                .setColor(0x9B59B6)
                .setTitle(`📊 Advanced Stats: ${response.data.account?.name || username}`)
                .setDescription(`**Mode:** ${mode.charAt(0).toUpperCase() + mode.slice(1)}`)
                .setThumbnail('https://fortnite-api.com/images/logo.png')
                .setTimestamp();

            // Core stats
            embed.addFields(
                { name: '🏆 Wins', value: (modeStats.wins || 0).toString(), inline: true },
                { name: '🎯 K/D', value: (modeStats.kd || 0).toFixed(2), inline: true },
                { name: '📈 Win Rate', value: `${(modeStats.winRate || 0).toFixed(1)}%`, inline: true },
                { name: '🎮 Matches', value: (modeStats.matches || 0).toString(), inline: true },
                { name: '💀 Kills', value: (modeStats.kills || 0).toString(), inline: true },
                { name: '⬆️ Top 3', value: (modeStats.top3 || 0).toString(), inline: true }
            );

            // Advanced metrics
            if (modeStats.playersOutlived) {
                embed.addFields({
                    name: '☠️ Players Outlived',
                    value: modeStats.playersOutlived.toLocaleString(),
                    inline: true
                });
            }

            if (modeStats.minutesPlayed) {
                const hours = Math.floor(modeStats.minutesPlayed / 60);
                embed.addFields({
                    name: '⏱️ Time Played',
                    value: `${hours} hours`,
                    inline: true
                });
            }

            // Comparison with other modes
            if (mode === 'overall' && (stats.solo || stats.duo || stats.squad)) {
                embed.addFields({ name: '\u200B', value: '**Mode Breakdown**', inline: false });
                
                ['solo', 'duo', 'squad', 'ltm'].forEach(m => {
                    if (stats[m]) {
                        const s = stats[m];
                        embed.addFields({
                            name: `${m.charAt(0).toUpperCase() + m.slice(1)}`,
                            value: `Wins: ${s.wins || 0} | K/D: ${(s.kd || 0).toFixed(2)}`,
                            inline: true
                        });
                    }
                });
            }

            // Performance rating
            const kd = modeStats.kd || 0;
            let rating = '⚪ Novice';
            if (kd >= 3) rating = '🔴 Elite';
            else if (kd >= 2) rating = '🟠 Expert';
            else if (kd >= 1.5) rating = '🟡 Advanced';
            else if (kd >= 1) rating = '🟢 Intermediate';

            embed.addFields({
                name: '📊 Skill Rating',
                value: rating,
                inline: false
            });

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            logger.error('Advanced stats error:', error);
            await interaction.editReply({
                embeds: [createErrorEmbed('Error', 'Failed to fetch advanced stats.')]
            });
        }
    }
};
