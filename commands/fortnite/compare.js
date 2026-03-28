const { SlashCommandBuilder } = require('discord.js');
const fortniteAPI = require('../../services/fortnite-api');
const { EmbedBuilder } = require('discord.js');
const { createErrorEmbed } = require('../../utils/embeds');
const { validateUsername } = require('../../utils/validators');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('compare')
        .setDescription('Compare stats between two players')
        .addStringOption(option =>
            option.setName('player1')
                .setDescription('First player username')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('player2')
                .setDescription('Second player username')
                .setRequired(true)),

    async execute(interaction) {
        const player1 = interaction.options.getString('player1');
        const player2 = interaction.options.getString('player2');

        if (!validateUsername(player1) || !validateUsername(player2)) {
            return interaction.reply({
                embeds: [createErrorEmbed('Invalid Username', 'Please provide valid Epic Games usernames.')],
                ephemeral: true
            });
        }

        await interaction.deferReply();

        try {
            const [stats1, stats2] = await Promise.all([
                fortniteAPI.getStats(player1),
                fortniteAPI.getStats(player2)
            ]);

            if (!stats1.data?.stats || !stats2.data?.stats) {
                return interaction.editReply({
                    embeds: [createErrorEmbed('Player Not Found', 'One or both players were not found or have private stats.')]
                });
            }

            const s1 = stats1.data.stats.all?.overall || {};
            const s2 = stats2.data.stats.all?.overall || {};

            const name1 = stats1.data.account?.name || player1;
            const name2 = stats2.data.account?.name || player2;

            const embed = new EmbedBuilder()
                .setColor(0x9B59B6)
                .setTitle('⚔️ Player Comparison')
                .setDescription(`${name1} **VS** ${name2}`);

            // Comparison fields
            const fields = [
                { label: '🏆 Wins', v1: s1.wins || 0, v2: s2.wins || 0 },
                { label: '🎯 K/D', v1: (s1.kd || 0).toFixed(2), v2: (s2.kd || 0).toFixed(2) },
                { label: '📈 Win Rate', v1: `${(s1.winRate || 0).toFixed(1)}%`, v2: `${(s2.winRate || 0).toFixed(1)}%` },
                { label: '🎮 Matches', v1: s1.matches || 0, v2: s2.matches || 0 },
                { label: '💀 Kills', v1: s1.kills || 0, v2: s2.kills || 0 }
            ];

            for (const field of fields) {
                const winner = parseFloat(field.v1) > parseFloat(field.v2) ? name1 : 
                              parseFloat(field.v1) < parseFloat(field.v2) ? name2 : 'Tie';
                const emoji = winner === name1 ? '🔵' : winner === name2 ? '🔴' : '⚪';
                
                embed.addFields({
                    name: field.label,
                    value: `${emoji} **${name1}:** ${field.v1}\n${emoji} **${name2}:** ${field.v2}`,
                    inline: true
                });
            }

            // Overall winner based on wins
            const wins1 = s1.wins || 0;
            const wins2 = s2.wins || 0;
            const overallWinner = wins1 > wins2 ? name1 : wins1 < wins2 ? name2 : 'Tie';
            
            embed.setFooter({ text: `Overall: ${overallWinner === 'Tie' ? 'It\'s a tie!' : `${overallWinner} is winning!`}` });

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            logger.error('Compare command error:', error);
            await interaction.editReply({
                embeds: [createErrorEmbed('Error', 'Failed to compare stats. Please try again later.')]
            });
        }
    }
};
