const { run, get, all } = require('../database/connection');
const config = require('../config');
const logger = require('../utils/logger');

class InviteTracker {
    constructor() {
        this.antiCheatDays = config.invites.antiCheatDays;
    }

    async generateInviteCode(userId) {
        const code = this.generateRandomCode();
        try {
            await run(
                `INSERT OR REPLACE INTO users (id, discord_id, invite_code, joined_at)
                VALUES (?, ?, ?, ?)`,
                [userId, userId, code, Math.floor(Date.now() / 1000)]
            );
            return code;
        } catch (error) {
            logger.error('Error generating invite code:', error);
            throw error;
        }
    }

    generateRandomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    async trackJoin(guild, member, invite) {
        try {
            const accountAge = Date.now() - member.user.createdTimestamp;
            const minAge = this.antiCheatDays * 24 * 60 * 60 * 1000;
            
            if (accountAge < minAge) {
                logger.info(`Account ${member.user.tag} is too new (${Math.floor(accountAge / 86400000)} days), not counting invite`);
                return null;
            }

            const existingUser = await get('SELECT * FROM users WHERE discord_id = ?', [member.id]);
            if (existingUser && existingUser.joined_at) {
                logger.info(`User ${member.user.tag} has joined before, not counting invite`);
                return null;
            }

            let inviterId = null;
            let inviteCode = null;
            if (invite) {
                inviterId = invite.inviter?.id;
                inviteCode = invite.code;
            }

            await run(
                `INSERT OR REPLACE INTO users (id, discord_id, joined_at)
                VALUES (?, ?, ?)`,
                [member.id, member.id, Math.floor(Date.now() / 1000)]
            );

            if (inviterId) {
                await run(
                    `UPDATE users SET invites = invites + 1 WHERE discord_id = ?`,
                    [inviterId]
                );

                await run(
                    `INSERT INTO invites (user_id, invited_user_id, invited_discord_id, invite_code)
                    VALUES (?, ?, ?, ?)`,
                    [inviterId, member.id, member.id, inviteCode || 'unknown']
                );

                logger.info(`Tracked invite: ${inviterId} invited ${member.id}`);
                return inviterId;
            }

            return null;
        } catch (error) {
            logger.error('Error tracking join:', error);
            return null;
        }
    }

    async trackLeave(member) {
        try {
            await run(
                `UPDATE users SET updated_at = ? WHERE discord_id = ?`,
                [Math.floor(Date.now() / 1000), member.id]
            );
        } catch (error) {
            logger.error('Error tracking leave:', error);
        }
    }

    async getInviteCount(userId) {
        try {
            const result = await get('SELECT invites FROM users WHERE discord_id = ?', [userId]);
            return result?.invites || 0;
        } catch (error) {
            logger.error('Error getting invite count:', error);
            return 0;
        }
    }

    async getInvitedUsers(userId) {
        try {
            return await all(
                `SELECT invited_discord_id, created_at 
                FROM invites 
                WHERE user_id = ? AND is_valid = 1
                ORDER BY created_at DESC`,
                [userId]
            );
        } catch (error) {
            logger.error('Error getting invited users:', error);
            return [];
        }
    }

    async getTopInviters(limit = 10) {
        try {
            return await all(
                `SELECT discord_id, invites 
                FROM users 
                WHERE invites > 0
                ORDER BY invites DESC 
                LIMIT ?`,
                [limit]
            );
        } catch (error) {
            logger.error('Error getting top inviters:', error);
            return [];
        }
    }

    async spendInvites(userId, amount) {
        try {
            const current = await this.getInviteCount(userId);
            if (current < amount) {
                return { success: false, error: 'Not enough invites' };
            }
            await run(
                `UPDATE users SET invites = invites - ? WHERE discord_id = ?`,
                [amount, userId]
            );
            return { success: true, remaining: current - amount };
        } catch (error) {
            logger.error('Error spending invites:', error);
            return { success: false, error: 'Database error' };
        }
    }

    async addInvites(userId, amount) {
        try {
            await run(
                `UPDATE users SET invites = invites + ? WHERE discord_id = ?`,
                [amount, userId]
            );
            return true;
        } catch (error) {
            logger.error('Error adding invites:', error);
            return false;
        }
    }
}

module.exports = new InviteTracker();
