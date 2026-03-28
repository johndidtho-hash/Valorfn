const { run } = require('../database/connection');
const logger = require('../utils/logger');

class ModLogService {
    async log(actionType, details, userId = null, moderatorId = null) {
        try {
            await run(
                `INSERT INTO mod_log (action_type, user_id, moderator_id, details)
                VALUES (?, ?, ?, ?)`,
                [actionType, userId, moderatorId, JSON.stringify(details)]
            );
            logger.info(`Mod log: ${actionType}`, details);
        } catch (error) {
            logger.error('Error writing mod log:', error);
        }
    }

    logRoleClaim(userId, roleType, method) {
        this.log('ROLE_CLAIM', {
            roleType,
            method,
            timestamp: new Date().toISOString()
        }, userId);
    }

    logPurchase(userId, tier, amount, currency) {
        this.log('PURCHASE', {
            tier,
            amount,
            currency,
            timestamp: new Date().toISOString()
        }, userId);
    }

    logGiveawayWinner(giveawayId, userId, prize) {
        this.log('GIVEAWAY_WIN', {
            giveawayId,
            prize,
            timestamp: new Date().toISOString()
        }, userId);
    }

    logInviteSpent(userId, amount, reason) {
        this.log('INVITE_SPENT', {
            amount,
            reason,
            timestamp: new Date().toISOString()
        }, userId);
    }

    logCommandUse(userId, commandName, channelId) {
        this.log('COMMAND_USE', {
            commandName,
            channelId,
            timestamp: new Date().toISOString()
        }, userId);
    }

    logError(errorType, errorMessage, userId = null) {
        this.log('ERROR', {
            errorType,
            errorMessage,
            timestamp: new Date().toISOString()
        }, userId);
    }
}

module.exports = new ModLogService();
