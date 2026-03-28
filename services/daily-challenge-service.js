const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { run, get } = require('../database/connection');
const config = require('../config');
const logger = require('../utils/logger');

const CHALLENGES = [
    { description: 'Play 3 matches in Battle Royale', reward: 2, type: 'invites' },
    { description: 'Get a Victory Royale', reward: 5, type: 'invites' },
    { description: 'Get 10 eliminations in a single match', reward: 3, type: 'invites' },
    { description: 'Survive to top 10 in solos', reward: 2, type: 'invites' },
    { description: 'Use 3 different weapons in one match', reward: 1, type: 'invites' },
    { description: 'Complete a Daily Quest in Save the World', reward: 2, type: 'invites' },
    { description: 'Play a Creative map for 15 minutes', reward: 1, type: 'invites' },
    { description: 'Find 5 chests in one match', reward: 2, type: 'invites' },
    { description: 'Deal 1000 damage in a single match', reward: 3, type: 'invites' },
    { description: 'Use a launchpad or rift', reward: 1, type: 'invites' }
];

class DailyChallengeService {
    constructor(client) {
        this.client = client;
    }

    async postNewChallenge() {
        try {
            const challenge = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
            const today = new Date().toISOString().split('T')[0];

            // Save to database
            await run(
                `INSERT OR REPLACE INTO daily_challenges (challenge_date, description, reward_type, reward_amount)
                VALUES (?, ?, ?, ?)`,
                [today, challenge.description, challenge.type, challenge.reward]
            );

            // Post to channel
            const channel = await this.client.channels.fetch(config.channels.dailyChallenges);
            if (!channel) return;

            const embed = new EmbedBuilder()
                .setColor(0xE74C3C)
                .setTitle('🎯 Daily Challenge')
                .setDescription(`**${challenge.description}**`)
                .addFields(
                    { name: '🎁 Reward', value: `${challenge.reward} invites`, inline: true },
                    { name: '⏰ Resets In', value: '24 hours', inline: true }
                )
                .setFooter({ text: 'Complete the challenge and use /daily claim to earn your reward!' })
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('claim_daily')
                        .setLabel('Claim Reward')
                        .setStyle(ButtonStyle.Success)
                );

            await channel.send({ embeds: [embed], components: [row] });
            logger.info(`Posted daily challenge: ${challenge.description}`);
        } catch (error) {
            logger.error('Error posting daily challenge:', error);
        }
    }

    async getCurrentChallenge() {
        const today = new Date().toISOString().split('T')[0];
        return await get('SELECT * FROM daily_challenges WHERE challenge_date = ?', [today]);
    }

    async claimChallenge(userId) {
        try {
            const challenge = await this.getCurrentChallenge();
            if (!challenge) {
                return { success: false, error: 'No active challenge found' };
            }

            // Check if already claimed
            const existing = await get(
                `SELECT * FROM challenge_completions 
                WHERE challenge_id = ? AND user_id = ?`,
                [challenge.id, userId]
            );
            
            if (existing) {
                return { success: false, error: 'You have already claimed today\'s challenge' };
            }

            // Record completion
            await run(
                `INSERT INTO challenge_completions (challenge_id, user_id, reward_claimed)
                VALUES (?, ?, 1)`,
                [challenge.id, userId]
            );

            // Add rewards
            const { addInvites } = require('./invite-tracker');
            await addInvites(userId, challenge.reward_amount);

            return { 
                success: true, 
                reward: challenge.reward_amount,
                description: challenge.description
            };
        } catch (error) {
            logger.error('Error claiming challenge:', error);
            return { success: false, error: 'Database error' };
        }
    }
}

module.exports = DailyChallengeService;
