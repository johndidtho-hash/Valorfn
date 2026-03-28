const { EmbedBuilder } = require('discord.js');
const { all, run } = require('../database/connection');
const config = require('../config');
const logger = require('../utils/logger');
const inviteTracker = require('./invite-tracker');

class LeaderboardService {
    constructor(client) {
        this.client = client;
    }

    async updateLeaderboards() {
        try {
            await this.updateInviteLeaderboard();
            await this.updateActivityLeaderboard();
        } catch (error) {
            logger.error('Leaderboard update error:', error);
        }
    }

    async updateInviteLeaderboard() {
        const channel = await this.client.channels.fetch(config.channels.leaderboard);
        if (!channel) return;

        const topUsers = await inviteTracker.getTopInviters(10);
        
        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        
        let description = '';
        for (let i = 0; i < topUsers.length; i++) {
            const user = topUsers[i];
            const medal = medals[i] || `${i + 1}.`;
            description += `${medal} <@${user.discord_id}> - **${user.invites}** invites\n`;
        }

        if (!description) {
            description = 'No invite data yet. Invite friends to climb the ranks!';
        }

        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('🏆 Top Inviters Leaderboard')
            .setDescription(description)
            .setFooter({ text: 'Updated hourly | Invite friends to earn Premium/Elite!' })
            .setTimestamp();

        // Find existing message or send new one
        const messages = await channel.messages.fetch({ limit: 10 });
        const existing = messages.find(m => m.author.id === this.client.user.id && m.embeds[0]?.title?.includes('Inviters'));
        
        if (existing) {
            await existing.edit({ embeds: [embed] });
        } else {
            await channel.send({ embeds: [embed] });
        }
    }

    async updateActivityLeaderboard() {
        const channel = await this.client.channels.fetch(config.channels.leaderboard);
        if (!channel) return;

        const topUsers = await all(
            `SELECT discord_id, activity_points 
            FROM users 
            WHERE activity_points > 0
            ORDER BY activity_points DESC 
            LIMIT 10`
        );
        
        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        
        let description = '';
        for (let i = 0; i < topUsers.length; i++) {
            const user = topUsers[i];
            const medal = medals[i] || `${i + 1}.`;
            description += `${medal} <@${user.discord_id}> - **${user.activity_points}** points\n`;
        }

        if (!description) {
            description = 'No activity data yet. Use commands to earn points!';
        }

        const embed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle('🔥 Activity Leaderboard')
            .setDescription(description)
            .setFooter({ text: 'Updated hourly | Earn points by using commands!' })
            .setTimestamp();

        const messages = await channel.messages.fetch({ limit: 10 });
        const existing = messages.find(m => m.author.id === this.client.user.id && m.embeds[0]?.title?.includes('Activity'));
        
        if (existing) {
            await existing.edit({ embeds: [embed] });
        } else {
            await channel.send({ embeds: [embed] });
        }
    }

    async addActivityPoints(userId, points) {
        try {
            await run(
                `UPDATE users SET activity_points = activity_points + ? WHERE discord_id = ?`,
                [points, userId]
            );
        } catch (error) {
            logger.error('Error adding activity points:', error);
        }
    }
}

module.exports = LeaderboardService;
