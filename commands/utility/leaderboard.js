const { SlashCommandBuilder } = require('discord.js');
const inviteTracker = require('../../services/invite-tracker');
const { getDb } = require('../../database/connection');
const { createLeaderboardEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View server leaderboards')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of leaderboard')
                .setRequired(false)
                .addChoices(
                    { name: '📨 Invites', value: 'invites' },
                    { name: '🔥 Activity', value: 'activity' }
                )),

    async execute(interaction) {
        const type = interaction.options.getString('type') || 'invites';

        try {
            let users;
            
            if (type === 'invites') {
                users = await inviteTracker.getTopInviters(10);
            } else {
                const db = getDb();
                const stmt = db.prepare(`
                    SELECT discord_id, activity_points as activity_points
                    FROM users 
                    WHERE activity_points > 0
                    ORDER BY activity_points DESC 
                    LIMIT 10
                `);
                users = stmt.all();
            }

            const title = type === 'invites' ? 'Top Inviters' : 'Most Active Users';
            const embed = createLeaderboardEmbed(title, users, type);

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({
                content: 'Failed to fetch leaderboard data. Please try again.',
                ephemeral: true
            });
        }
    }
};
