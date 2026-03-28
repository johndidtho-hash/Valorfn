const { SlashCommandBuilder } = require('discord.js');
const fortniteAPI = require('../../services/fortnite-api');
const { createStatsEmbed, createErrorEmbed } = require('../../utils/embeds');
const { validateUsername } = require('../../utils/validators');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View Fortnite Battle Royale stats')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Epic Games username')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('platform')
                .setDescription('Platform filter')
                .setRequired(false)
                .addChoices(
                    { name: 'All Platforms', value: 'all' },
                    { name: 'PC', value: 'keyboardmouse' },
                    { name: 'Console', value: 'gamepad' },
                    { name: 'Touch/Mobile', value: 'touch' }
                )),

    async execute(interaction) {
        const username = interaction.options.getString('username');
        const platform = interaction.options.getString('platform') || 'all';

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
                    embeds: [createErrorEmbed('Player Not Found', `Could not find stats for "${username}". Make sure the username is correct and the account has played matches recently.`)]
                });
            }

            const stats = response.data.stats;
            let modeStats;

            // Extract stats based on platform
            if (platform === 'all') {
                modeStats = stats.all?.overall || {};
            } else {
                modeStats = stats[platform]?.overall || {};
            }

            const formattedStats = {
                wins: modeStats.wins || 0,
                matches: modeStats.matches || 0,
                kills: modeStats.kills || 0,
                kd: modeStats.kd || 0,
                winRate: modeStats.winRate || 0,
                top10: modeStats.top10 || 0,
                top25: modeStats.top25 || 0
            };

            const embed = createStatsEmbed(response.data.account?.name || username, formattedStats, platform);

            // Add additional stats
            if (stats.all?.solo) {
                embed.addFields({
                    name: '🎮 Solo Stats',
                    value: `Wins: ${stats.all.solo.wins || 0} | K/D: ${stats.all.solo.kd?.toFixed(2) || 0}`,
                    inline: true
                });
            }

            if (stats.all?.duo) {
                embed.addFields({
                    name: '👥 Duo Stats',
                    value: `Wins: ${stats.all.duo.wins || 0} | K/D: ${stats.all.duo.kd?.toFixed(2) || 0}`,
                    inline: true
                });
            }

            if (stats.all?.squad) {
                embed.addFields({
                    name: '👨‍👩‍👧‍👦 Squad Stats',
                    value: `Wins: ${stats.all.squad.wins || 0} | K/D: ${stats.all.squad.kd?.toFixed(2) || 0}`,
                    inline: true
                });
            }

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            logger.error('Stats command error:', error);
            await interaction.editReply({
                embeds: [createErrorEmbed('Error', 'Failed to fetch stats. The player may have private stats or the API is unavailable.')]
            });
        }
    }
};
